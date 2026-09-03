import { ChevronRight } from "lucide-react";
import type { PortalNavGroup } from "@/lib/lydo-connect-data";

type AdminBreadcrumbProps = {
  groups: PortalNavGroup[];
  activeId: string;
};

export const AdminBreadcrumb = ({ groups, activeId }: AdminBreadcrumbProps) => {
  const activeGroup = groups.find((group) => group.items.some((item) => item.id === activeId));
  const activeItem = activeGroup?.items.find((item) => item.id === activeId);

  return (
    <div className="sticky top-20 z-20 flex h-10 items-center gap-2.5 border-b border-slate-300 bg-admin-surface px-4">
      {activeGroup ? (
        <>
          <span className="font-segoe text-sm font-normal leading-none text-text-disabled">{activeGroup.label}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={2} />
        </>
      ) : null}
      <span className="font-segoe text-sm font-normal leading-none text-text-default">
        {activeItem?.label ?? activeId}
      </span>
    </div>
  );
};
