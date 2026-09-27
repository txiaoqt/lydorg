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
    <div className="sticky top-20 z-20 flex h-10 items-center gap-2.5 border-b border-border bg-admin-surface/80 backdrop-blur-xs px-4">
      {activeGroup ? (
        <>
          <span className="font-segoe text-sm font-normal leading-none text-muted-foreground">{activeGroup.label}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" strokeWidth={2} />
        </>
      ) : null}
      <span className="font-segoe text-sm font-medium leading-none text-foreground">
        {activeItem?.label ?? activeId}
      </span>
    </div>
  );
};
