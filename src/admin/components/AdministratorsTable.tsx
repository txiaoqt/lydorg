import { useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, Link2, MoreHorizontal, Pencil, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryChip } from "@/admin/components/InquiriesTable";
import type { AdministratorRecord } from "@/lib/lydo-connect-data";

export type AdministratorRoleFilter = "all" | string;
export type AdministratorUnitFilter = "all" | string;
export type AdministratorStatusFilter = "all" | "active" | "suspended";

type AdministratorsTableProps = {
  administrators: AdministratorRecord[];
  roleOptions: { code: string; label: string }[];
  unitOptions: { code: string; label: string }[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  roleFilter: AdministratorRoleFilter;
  onRoleFilterChange: (value: AdministratorRoleFilter) => void;
  unitFilter: AdministratorUnitFilter;
  onUnitFilterChange: (value: AdministratorUnitFilter) => void;
  statusFilter: AdministratorStatusFilter;
  onStatusFilterChange: (value: AdministratorStatusFilter) => void;
  currentAdminId: string | null;
  resendingInviteId: string | null;
  onEdit: (administrator: AdministratorRecord) => void;
  onToggleActive: (administrator: AdministratorRecord) => void;
  onDelete: (administrator: AdministratorRecord) => void;
  onResendInvite: (administrator: AdministratorRecord) => void;
};

const PAGE_SIZE = 10;

const MENU_ITEM_CLASS =
  "flex h-8 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 font-segoe text-sm font-normal leading-none";

const RolePill = ({ roleCode, roleLabel }: { roleCode: string | null; roleLabel: string | null }) => {
  if (!roleLabel) {
    return <span className="font-segoe text-xs text-slate-500">—</span>;
  }
  const isSuperAdmin = roleCode === "super_admin";
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center whitespace-nowrap rounded-full border px-2 py-1 font-segoe text-xs font-semibold leading-[140%]",
        isSuperAdmin
          ? "border-role-pink-border bg-role-pink-bg text-role-pink-text"
          : "border-role-blue-border bg-role-blue-bg text-role-blue-text",
      )}
    >
      {roleLabel}
    </span>
  );
};

const StatusPill = ({ active, passwordSet }: { active: boolean; passwordSet: boolean }) => {
  if (!passwordSet) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border-warning-subtle bg-amber-50 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-text-warning-secondary">
        Invitation Pending
      </span>
    );
  }
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-positive-secondary">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-warning-subtle bg-amber-50 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-text-warning-secondary">
      Suspended
    </span>
  );
};

export const AdministratorsTable = ({
  administrators,
  roleOptions,
  unitOptions,
  searchValue,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  unitFilter,
  onUnitFilterChange,
  statusFilter,
  onStatusFilterChange,
  currentAdminId,
  resendingInviteId,
  onEdit,
  onToggleActive,
  onDelete,
  onResendInvite,
}: AdministratorsTableProps) => {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(administrators.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => administrators.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE),
    [administrators, clampedPage],
  );

  const changePage = (next: number) => {
    setPage(Math.max(0, Math.min(next, totalPages - 1)));
  };

  const activeRoleLabel = roleFilter === "all" ? "All roles" : roleOptions.find((r) => r.code === roleFilter)?.label ?? "All roles";
  const activeUnitLabel = unitFilter === "all" ? "All units" : unitOptions.find((u) => u.code === unitFilter)?.label ?? "All units";
  const activeStatusLabel = statusFilter === "all" ? "All statuses" : statusFilter === "active" ? "Active" : "Suspended";

  return (
    <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface shadow-sm">
      {/* Header: search + role/unit/status filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 p-4">
        <div className="flex h-10 min-w-[120px] flex-1 items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
          <input
            value={searchValue}
            onChange={(event) => {
              onSearchChange(event.target.value);
              setPage(0);
            }}
            placeholder="Search administrators..."
            className="min-w-0 flex-1 border-0 bg-transparent p-0 font-segoe text-public-fs-body-sm text-text-default outline-none placeholder:text-text-disabled"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-[156px] shrink-0 items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default"
            >
              <span className="truncate">{activeRoleLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[156px] rounded-b-md rounded-t-none border-slate-300 p-0">
            <DropdownMenuItem
              onClick={() => {
                onRoleFilterChange("all");
                setPage(0);
              }}
              className={cn(
                "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                roleFilter === "all" && "bg-bg-info-tertiary text-public-text-brand",
              )}
            >
              All roles
            </DropdownMenuItem>
            {roleOptions.map((role) => (
              <DropdownMenuItem
                key={role.code}
                onClick={() => {
                  onRoleFilterChange(role.code);
                  setPage(0);
                }}
                className={cn(
                  "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                  roleFilter === role.code && "bg-bg-info-tertiary text-public-text-brand",
                )}
              >
                {role.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-[180px] shrink-0 items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default"
            >
              <span className="truncate">{activeUnitLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px] rounded-b-md rounded-t-none border-slate-300 p-0">
            <DropdownMenuItem
              onClick={() => {
                onUnitFilterChange("all");
                setPage(0);
              }}
              className={cn(
                "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                unitFilter === "all" && "bg-bg-info-tertiary text-public-text-brand",
              )}
            >
              All units
            </DropdownMenuItem>
            {unitOptions.map((unit) => (
              <DropdownMenuItem
                key={unit.code}
                onClick={() => {
                  onUnitFilterChange(unit.code);
                  setPage(0);
                }}
                className={cn(
                  "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                  unitFilter === unit.code && "bg-bg-info-tertiary text-public-text-brand",
                )}
              >
                {unit.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-[156px] shrink-0 items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default"
            >
              <span className="truncate">{activeStatusLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[156px] rounded-b-md rounded-t-none border-slate-300 p-0">
            {(["all", "active", "suspended"] as const).map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => {
                  onStatusFilterChange(status);
                  setPage(0);
                }}
                className={cn(
                  "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                  statusFilter === status && "bg-bg-info-tertiary text-public-text-brand",
                )}
              >
                {status === "all" ? "All statuses" : status === "active" ? "Active" : "Suspended"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-bg-neutral-subtle px-4 py-3 font-segoe text-xs font-semibold uppercase leading-[140%] text-text-neutral-tertiary">
        <span className="w-[30%]">User</span>
        <span className="w-[16%]">Role</span>
        <span className="w-[20%]">Unit</span>
        <span className="w-[12%]">Status</span>
        <span className="w-[12%]">Last Active</span>
        <span className="w-[80px] shrink-0">Actions</span>
      </div>

      {/* Rows */}
      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
          <p className="font-segoe text-sm font-semibold text-text-default">No administrators found</p>
          <p className="font-segoe text-xs text-slate-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        pageItems.map((administrator) => {
          const initial = administrator.displayName.trim().charAt(0).toUpperCase() || "?";
          const lastActiveDate = administrator.lastActiveAt ? new Date(administrator.lastActiveAt) : null;
          const isValidLastActive = lastActiveDate && !Number.isNaN(lastActiveDate.getTime());
          const isSelf = currentAdminId !== null && administrator.id === currentAdminId;

          return (
            <div
              key={administrator.id}
              className="flex items-center justify-between gap-2 border-b border-slate-300 p-4 last:border-b-0"
            >
              <div className="flex w-[30%] min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] bg-public-bg-brand">
                  <span className="font-segoe text-sm font-semibold leading-none text-neutral-100">{initial}</span>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">
                    {administrator.displayName}
                  </p>
                  <p className="truncate font-segoe text-xs leading-[140%] text-slate-500">{administrator.email}</p>
                </div>
              </div>

              <div className="flex w-[16%] items-center">
                <RolePill roleCode={administrator.roleCode} roleLabel={administrator.roleLabel} />
              </div>

              <div className="flex w-[20%] items-center">
                {administrator.unitLabel ? (
                  <CategoryChip category={administrator.unitLabel} />
                ) : (
                  <span className="font-segoe text-xs text-slate-500">—</span>
                )}
              </div>

              <div className="flex w-[12%] items-center">
                <StatusPill active={administrator.isActive} passwordSet={administrator.isPasswordSet} />
              </div>

              <div className="flex w-[12%] items-center">
                <p className="font-cascadia text-[12px] font-semibold leading-[140%] text-slate-500">
                  {isValidLastActive ? `${formatDistanceToNowStrict(lastActiveDate)} ago` : "—"}
                </p>
              </div>

              <div className="flex w-[80px] shrink-0 items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="More actions"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface p-2 transition-colors hover:bg-neutral-hover-subtle"
                    >
                      <MoreHorizontal className="h-4 w-4 text-text-default" strokeWidth={1.6} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="flex w-[160px] min-w-[160px] flex-col gap-1 rounded-md border-gray-200 bg-admin-surface p-1 shadow-md"
                  >
                    <DropdownMenuItem
                      className={cn(MENU_ITEM_CLASS, "text-public-text-neutral-default focus:bg-neutral-hover-subtle focus:text-public-text-neutral-default")}
                      onClick={() => onEdit(administrator)}
                    >
                      <Pencil className="h-4 w-4 shrink-0 text-public-text-secondary" strokeWidth={1.6} />
                      Edit
                    </DropdownMenuItem>
                    {!administrator.isPasswordSet ? (
                      <DropdownMenuItem
                        disabled={resendingInviteId === administrator.id}
                        className={cn(
                          MENU_ITEM_CLASS,
                          "text-public-text-neutral-default focus:bg-neutral-hover-subtle focus:text-public-text-neutral-default",
                          resendingInviteId === administrator.id && "pointer-events-none opacity-50",
                        )}
                        onClick={() => onResendInvite(administrator)}
                      >
                        <Link2 className="h-4 w-4 shrink-0 text-public-text-secondary" strokeWidth={1.6} />
                        Resend Invite
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem
                      disabled={isSelf}
                      className={cn(
                        MENU_ITEM_CLASS,
                        administrator.isActive
                          ? "text-text-warning-secondary focus:bg-amber-50 focus:text-text-warning-secondary"
                          : "text-positive-secondary focus:bg-bg-success-subtle focus:text-positive-secondary",
                        isSelf && "pointer-events-none opacity-50",
                      )}
                      onClick={() => onToggleActive(administrator)}
                    >
                      {administrator.isActive ? (
                        <>
                          <UserX className="h-4 w-4 shrink-0 text-text-warning-secondary" strokeWidth={1.6} />
                          Suspend
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 shrink-0 text-positive-secondary" strokeWidth={1.6} />
                          Reactivate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isSelf}
                      className={cn(
                        MENU_ITEM_CLASS,
                        "text-icon-danger-secondary focus:bg-danger-subtle focus:text-icon-danger-secondary",
                        isSelf && "pointer-events-none opacity-50",
                      )}
                      onClick={() => onDelete(administrator)}
                    >
                      <Trash2 className="h-4 w-4 shrink-0 text-icon-danger-secondary" strokeWidth={1.6} />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })
      )}

      {/* Footer / pagination */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-300 p-4">
        <p className="font-segoe text-[13px] text-text-neutral-tertiary">
          Showing <span className="text-text-default">{pageItems.length}</span> of{" "}
          <span className="text-text-default">{administrators.length}</span> records
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changePage(clampedPage - 1)}
            disabled={clampedPage === 0}
            className="flex items-center gap-2 rounded-md px-3 py-2 font-segoe text-[13px] text-text-neutral-tertiary disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.6} />
            Previous
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, index) => index)
              .slice(0, 5)
              .map((index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => changePage(index)}
                  className={cn(
                    "flex h-[29px] w-8 items-center justify-center rounded-lg font-segoe text-[13px]",
                    index === clampedPage
                      ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                      : "text-text-default hover:bg-slate-50",
                  )}
                >
                  {index + 1}
                </button>
              ))}
          </div>
          <button
            type="button"
            onClick={() => changePage(clampedPage + 1)}
            disabled={clampedPage >= totalPages - 1}
            className="flex items-center gap-2 rounded-md px-3 py-2 font-segoe text-[13px] text-text-default disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </div>
  );
};
