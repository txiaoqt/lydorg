import { ChevronRight } from "lucide-react";
import type { PortalNavGroup } from "@/lib/lydo-connect-data";

type AdminBreadcrumbProps = {
  groups: PortalNavGroup[];
  activeId: string;
  /** Open record (e.g. organization name) shown as the last crumb. */
  detailLabel?: string;
};

export const AdminBreadcrumb = ({ groups, activeId, detailLabel }: AdminBreadcrumbProps) => {
  const activeGroup = groups.find((group) => group.items.some((item) => item.id === activeId));
  const activeItem = activeGroup?.items.find((item) => item.id === activeId);

  return (
    <div className="sticky top-20 z-20 flex h-10 items-center gap-2.5 border-b border-border bg-admin-surface px-4">
      {activeGroup ? (
        <>
          <span className="font-inter text-sm font-normal leading-none text-muted-foreground">{activeGroup.label}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" strokeWidth={2} />
        </>
      ) : null}
      <span className={detailLabel ? "font-inter text-sm font-normal leading-none text-muted-foreground" : "font-inter text-sm font-medium leading-none text-foreground"}>
        {/* Pages outside the nav (e.g. notifications) fall back to their route id, so title-case it. */}
        {activeItem?.label ?? activeId.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
      </span>
      {detailLabel ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" strokeWidth={2} />
          <span className="min-w-0 truncate font-inter text-sm font-medium leading-none text-foreground">{detailLabel}</span>
        </>
      ) : null}
    </div>
  );
};
