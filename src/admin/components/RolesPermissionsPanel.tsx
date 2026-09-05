import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Award,
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  Info,
  Lock,
  MessageSquare,
  Save,
  Shield,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { DangerConfirmDialog } from "@/components/portal/DangerConfirmDialog";
import type { AdministratorRecord, AdminRoleRecord } from "@/lib/lydo-connect-data";
import { ADMIN_PERMISSION_GROUPS, ADMIN_PERMISSION_TOTAL_COUNT } from "@/lib/admin-permissions";

type RolesPermissionsPanelProps = {
  administrators: AdministratorRecord[];
  roles: AdminRoleRecord[];
  onUpdateRolePermissions: (roleId: number, permissionCodes: string[]) => Promise<void>;
  configuringRoleCode: "super_admin" | "admin";
  onConfiguringRoleChange: (code: "super_admin" | "admin") => void;
  subTab: "edit" | "compare";
  onSubTabChange: (tab: "edit" | "compare") => void;
};

const GROUP_ICONS: Record<string, LucideIcon> = {
  organizations: Globe,
  programs: Award,
  budget_management: Wallet,
  content: Archive,
  communication: MessageSquare,
  administration: Shield,
};

const countAssigned = (administrators: AdministratorRecord[], roleCode: string) =>
  administrators.filter((administrator) => administrator.roleCode === roleCode).length;

const arraysEqualAsSets = (a: string[], b: string[]) => a.length === b.length && a.every((code) => b.includes(code));

const PermissionStatusBadge = ({ granted }: { granted: boolean }) => (
  <div
    className={cn(
      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
      granted ? "bg-positive-secondary" : "bg-slate-300",
    )}
  >
    {granted ? <Check className="h-4 w-4 text-white" strokeWidth={2.5} /> : <X className="h-4 w-4 text-white" strokeWidth={2.5} />}
  </div>
);

type PermissionGridProps = {
  permissionCodes: string[];
  readOnly: boolean;
  disabled: boolean;
  onToggle: (code: string, currentlyChecked: boolean) => void;
  onDeselectAll: (groupCodes: string[]) => void;
};

const PermissionGrid = ({ permissionCodes, readOnly, disabled, onToggle, onDeselectAll }: PermissionGridProps) => (
  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
    {ADMIN_PERMISSION_GROUPS.map((group) => {
      const GroupIcon = GROUP_ICONS[group.code] ?? Shield;
      const grantedCount = group.items.filter((item) => permissionCodes.includes(item.code)).length;
      const groupCodes = group.items.map((item) => item.code);

      return (
        <div key={group.code} className="flex flex-col gap-2 rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-slate-300 pb-2 pt-1.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-neutral-100 p-2">
                <GroupIcon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.6} />
              </div>
              <p className="font-segoe text-sm font-semibold leading-none text-public-text-neutral-default">{group.label}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center rounded border-[0.6px] border-slate-300 bg-admin-surface px-1.5 py-1 font-cascadia text-[8px] font-semibold leading-[140%] text-slate-500">
                {grantedCount}/{group.items.length}
              </span>
              {readOnly ? null : (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onDeselectAll(groupCodes)}
                  className="font-segoe text-[13px] font-semibold leading-none text-public-bg-brand hover:underline disabled:opacity-50"
                >
                  Deselect All
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-md border border-slate-300 bg-gray-50">
            {group.items.map((item, index) => {
              const checked = permissionCodes.includes(item.code);
              return (
                <div
                  key={item.code}
                  className={cn("flex items-start gap-3 p-4", index < group.items.length - 1 && "border-b border-slate-300")}
                >
                  <Checkbox
                    checked={checked}
                    disabled={readOnly || disabled}
                    onCheckedChange={() => onToggle(item.code, checked)}
                    className="mt-0.5 border-slate-300 data-[state=checked]:border-public-bg-brand data-[state=checked]:bg-public-bg-brand data-[state=checked]:text-public-text-neutral-on-neutral"
                  />
                  <div className="flex flex-col gap-0.5">
                    <p className="font-segoe text-[13px] font-semibold leading-[140%] text-public-text-neutral-default">
                      {item.label}
                    </p>
                    <p className="font-segoe text-[11px] font-normal leading-[140%] text-segmented-control-inactive-text">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    })}
  </div>
);

export const RolesPermissionsPanel = ({
  administrators,
  roles,
  onUpdateRolePermissions,
  configuringRoleCode,
  onConfiguringRoleChange,
  subTab,
  onSubTabChange,
}: RolesPermissionsPanelProps) => {
  const [superAdminFullListExpanded, setSuperAdminFullListExpanded] = useState(false);
  const [adminFullListExpanded, setAdminFullListExpanded] = useState(false);

  const superAdminCount = countAssigned(administrators, "super_admin");
  const adminCount = countAssigned(administrators, "admin");

  const superAdminRole = roles.find((role) => role.code === "super_admin") ?? null;
  const adminRole = roles.find((role) => role.code === "admin") ?? null;

  const [draftAdminPermissionCodes, setDraftAdminPermissionCodes] = useState<string[]>(adminRole?.permissionCodes ?? []);
  const [pendingSaveConfirmOpen, setPendingSaveConfirmOpen] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    setDraftAdminPermissionCodes(adminRole?.permissionCodes ?? []);
  }, [adminRole?.permissionCodes]);

  const isDirty = !arraysEqualAsSets(draftAdminPermissionCodes, adminRole?.permissionCodes ?? []);

  const superAdminPermsLabel = `${superAdminRole?.permissionCodes.length ?? ADMIN_PERMISSION_TOTAL_COUNT}/${ADMIN_PERMISSION_TOTAL_COUNT}`;
  const adminPermsLabel = `${adminRole?.permissionCodes.length ?? 0}/${ADMIN_PERMISSION_TOTAL_COUNT}`;

  const toggleDraftPermission = (code: string, currentlyChecked: boolean) => {
    setDraftAdminPermissionCodes((prev) => (currentlyChecked ? prev.filter((existing) => existing !== code) : [...prev, code]));
  };

  const deselectAllDraftInGroup = (groupCodes: string[]) => {
    setDraftAdminPermissionCodes((prev) => prev.filter((existing) => !groupCodes.includes(existing)));
  };

  const handleConfirmSavePermissions = async () => {
    if (!adminRole) return;
    setSavingPermissions(true);
    try {
      await onUpdateRolePermissions(adminRole.id, draftAdminPermissionCodes);
    } finally {
      setSavingPermissions(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface p-4">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 shrink-0 text-public-text-neutral-default" strokeWidth={2.5} />
          <div className="flex flex-col gap-0.5">
            <p className="font-segoe text-lg font-semibold leading-[120%] tracking-[-0.02em] text-text-default">
              Roles &amp; Permissions
            </p>
            <p className="font-segoe text-public-fs-body-sm font-normal leading-[140%] text-slate-500">
              Configure administrator roles and manage feature-level permissions.
            </p>
          </div>
        </div>

        <div className="flex h-[52px] shrink-0 items-center gap-1 rounded-md border border-segmented-control-border bg-segmented-control-bg p-1">
          <button
            type="button"
            onClick={() => onSubTabChange("edit")}
            className={cn(
              "flex h-11 items-center justify-center whitespace-nowrap rounded-md px-4 font-segoe text-sm font-semibold leading-[140%] transition-colors",
              subTab === "edit" ? "bg-admin-surface text-public-bg-brand" : "text-segmented-control-inactive-text",
            )}
          >
            Edit Permissions
          </button>
          <button
            type="button"
            onClick={() => onSubTabChange("compare")}
            className={cn(
              "flex h-11 items-center justify-center whitespace-nowrap rounded-md px-4 font-segoe text-sm font-semibold leading-[140%] transition-colors",
              subTab === "compare" ? "bg-admin-surface text-public-bg-brand" : "text-segmented-control-inactive-text",
            )}
          >
            Compare Roles
          </button>
        </div>
      </div>

      {subTab === "compare" ? (
        <div className="flex flex-col overflow-hidden rounded-md border border-slate-300 bg-admin-surface shadow-sm">
          <div className="flex flex-col gap-2.5 border-b border-slate-300 px-4 pb-4 pt-6">
            <p className="font-segoe text-lg font-semibold leading-none text-text-default">
              Compare Roles: <span className="font-bold text-role-pink-text">Super Admin</span> vs.{" "}
              <span className="font-bold text-role-blue-text">Admin</span>
            </p>
            <p className="font-segoe text-sm font-normal leading-[140%] text-slate-500">
              Compare administrator roles and review differences in their access and permissions.
            </p>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-300 bg-bg-neutral-subtle px-4 py-3 font-segoe text-xs font-semibold uppercase leading-[140%]">
            <span className="flex-1 text-text-neutral-tertiary">Module</span>
            <span className="w-[140px] shrink-0 text-center text-role-pink-text">Super Admin</span>
            <span className="w-[140px] shrink-0 text-center text-role-blue-text">Admin</span>
          </div>

          {ADMIN_PERMISSION_GROUPS.map((group) => (
              <div key={group.code}>
                <div className="border-b border-slate-300 bg-neutral-hover-subtle px-4 py-2 font-segoe text-[12px] font-semibold leading-[140%] text-public-text-neutral-default">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const superAdminGranted = superAdminRole?.permissionCodes.includes(item.code) ?? false;
                  const adminGranted = adminRole?.permissionCodes.includes(item.code) ?? false;
                  return (
                    <div key={item.code} className="flex items-center gap-2 border-b border-slate-300 p-4 last:border-b-0">
                      <div className="flex flex-1 flex-col gap-0.5">
                        <p className="font-segoe text-[13px] font-semibold leading-[140%] text-public-text-neutral-default">
                          {item.label}
                        </p>
                        <p className="font-segoe text-xs font-normal leading-[140%] text-slate-500">{item.description}</p>
                      </div>
                      <div className="flex w-[140px] shrink-0 items-center justify-center">
                        <PermissionStatusBadge granted={superAdminGranted} />
                      </div>
                      <div className="flex w-[140px] shrink-0 items-center justify-center">
                        <PermissionStatusBadge granted={adminGranted} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      ) : (
        <>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => onConfiguringRoleChange("super_admin")}
              className={cn(
                "flex flex-1 flex-col gap-2 rounded-md border border-slate-300 px-4 py-6 text-left shadow-sm transition-colors",
                configuringRoleCode === "super_admin" ? "bg-slate-50" : "bg-admin-surface",
              )}
            >
              <p className="font-segoe text-base font-semibold uppercase leading-[140%] text-role-pink-text">Super Admin</p>
              <p className="text-justify font-segoe text-sm font-normal leading-[140%] text-slate-500">
                Full administrative access, including administrator accounts, roles, permissions, and system-wide controls.
              </p>
              <div className="flex items-center justify-between gap-2 border-t border-slate-300 pt-3">
                <p className="font-segoe text-sm font-semibold leading-[140%] text-slate-500">
                  {superAdminCount} {superAdminCount === 1 ? "administrator" : "administrators"} assigned
                </p>
                <span className="inline-flex items-center whitespace-nowrap rounded-full border border-neutral-200 bg-neutral-100 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-public-text-secondary">
                  {superAdminPermsLabel} perms
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onConfiguringRoleChange("admin")}
              className={cn(
                "flex flex-1 flex-col gap-2 rounded-md border border-slate-300 px-4 py-6 text-left shadow-sm transition-colors",
                configuringRoleCode === "admin" ? "bg-slate-50" : "bg-admin-surface",
              )}
            >
              <p className="font-segoe text-base font-semibold uppercase leading-[140%] text-role-blue-text">Admin</p>
              <p className="text-justify font-segoe text-sm font-normal leading-[140%] text-slate-500">
                Access to administrative features, excluding administrator accounts, roles, and permission management.
              </p>
              <div className="flex items-center justify-between gap-2 border-t border-slate-300 pt-3">
                <p className="font-segoe text-sm font-semibold leading-[140%] text-slate-500">
                  {adminCount} {adminCount === 1 ? "administrator" : "administrators"} assigned
                </p>
                <span className="inline-flex items-center whitespace-nowrap rounded-full border border-access-pill-border bg-access-pill-bg px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-public-text-brand-secondary">
                  {adminPermsLabel} perms
                </span>
              </div>
            </button>
          </div>

          <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-300 px-4 pb-4 pt-6">
              <div className="flex flex-col gap-2.5">
                <p className="font-segoe text-lg font-semibold leading-none text-text-default">
                  Configuring Role:{" "}
                  <span
                    className={cn(
                      "font-bold",
                      configuringRoleCode === "super_admin" ? "text-role-pink-text" : "text-role-blue-text",
                    )}
                  >
                    {configuringRoleCode === "super_admin" ? "Super Admin" : "Admin"}
                  </span>
                </p>
                <p className="font-segoe text-sm font-normal leading-[140%] text-slate-500">
                  {configuringRoleCode === "super_admin"
                    ? "Full administrative access across all modules, administrator accounts, permissions, and system settings."
                    : "Standard administrative access across day-to-day modules, without administrator account or role management."}
                </p>
              </div>
              {configuringRoleCode === "admin" && isDirty ? (
                <button
                  type="button"
                  disabled={savingPermissions}
                  onClick={() => setPendingSaveConfirmOpen(true)}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-md bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover disabled:opacity-50"
                >
                  <Save className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                  Save Changes
                </button>
              ) : null}
            </div>

            {configuringRoleCode === "super_admin" ? (
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-start gap-2.5 rounded-md border border-status-danger-border bg-danger-subtle p-6">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-icon-danger-secondary" strokeWidth={2} />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-justify font-segoe text-[13px] font-semibold leading-[120%] text-icon-danger-secondary">
                      Super Admin — Full Access
                    </p>
                    <p className="text-justify font-segoe text-[13px] font-normal leading-[120%] text-icon-danger-secondary">
                      This role has full administrative access. Permissions cannot be restricted or modified for the Super
                      Admin role.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSuperAdminFullListExpanded((value) => !value)}
                  className="flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-gray-50 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start gap-2.5">
                    <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" strokeWidth={2} />
                    <div className="flex flex-col gap-0.5 text-left">
                      <p className="text-justify font-segoe text-[13px] font-semibold leading-[120%] text-text-default">
                        Super Admin — Full Access
                      </p>
                      <p className="text-justify font-segoe text-[13px] font-normal leading-[120%] text-slate-500">
                        All available permissions are granted to this role and cannot be modified.
                      </p>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap font-segoe text-[13px] font-semibold leading-[140%] text-public-bg-brand">
                    {superAdminFullListExpanded ? "Hide Full List" : "View Full List"}
                    {superAdminFullListExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
                    )}
                  </span>
                </button>

                {superAdminFullListExpanded ? (
                  <PermissionGrid
                    permissionCodes={superAdminRole?.permissionCodes ?? []}
                    readOnly
                    disabled={false}
                    onToggle={() => undefined}
                    onDeselectAll={() => undefined}
                  />
                ) : null}

                <div className="flex items-center gap-2 border-t border-slate-300 pt-4">
                  <Info className="h-4 w-4 shrink-0 text-text-default" strokeWidth={1.6} />
                  <p className="font-segoe text-sm font-normal leading-[140%] text-slate-500">
                    Switch to the <span className="font-semibold text-text-default">Admin</span> role above to configure its
                    permissions by category.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setAdminFullListExpanded((value) => !value)}
                  className="flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-gray-50 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start gap-2.5">
                    <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" strokeWidth={2} />
                    <div className="flex flex-col gap-0.5 text-left">
                      <p className="text-justify font-segoe text-[13px] font-semibold leading-[120%] text-text-default">
                        Admin — Configurable Access
                      </p>
                      <p className="text-justify font-segoe text-[13px] font-normal leading-[120%] text-slate-500">
                        Manage the permissions available to administrators assigned to this role.
                      </p>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap font-segoe text-[13px] font-semibold leading-[140%] text-public-bg-brand">
                    {adminFullListExpanded ? "Hide Full List" : "View Full List"}
                    {adminFullListExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
                    )}
                  </span>
                </button>

                {adminFullListExpanded ? (
                  <PermissionGrid
                    permissionCodes={draftAdminPermissionCodes}
                    readOnly={false}
                    disabled={savingPermissions}
                    onToggle={toggleDraftPermission}
                    onDeselectAll={deselectAllDraftInGroup}
                  />
                ) : null}
              </div>
            )}
          </div>
        </>
      )}

      <DangerConfirmDialog
        variant="info"
        open={pendingSaveConfirmOpen}
        onOpenChange={setPendingSaveConfirmOpen}
        icon={Save}
        title="Save Permission Changes"
        description="Are you sure you want to update the permissions granted to the Admin role?"
        warning="Administrators assigned to the Admin role will immediately gain or lose access based on these changes."
        confirmLabel="Save Changes"
        confirmIcon={Save}
        onConfirm={handleConfirmSavePermissions}
      />
    </div>
  );
};
