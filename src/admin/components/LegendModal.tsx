import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type LegendItem = {
  key: string;
  label: string;
  description: string;
  badge: React.ReactNode;
};

type LegendModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  items?: LegendItem[];
  groups?: Array<{
    key: string;
    title: string;
    items: LegendItem[];
    defaultExpanded?: boolean;
  }>;
};

export function LegendModal({ open, onOpenChange, title, description, items = [], groups }: LegendModalProps) {
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!groups) return;
    const next: Record<string, boolean> = {};
    for (const group of groups) {
      next[group.key] = group.defaultExpanded ?? true;
    }
    setExpandedGroups(next);
  }, [groups, open]);

  const renderItems = (legendItems: LegendItem[]) => (
    <div className="space-y-3">
      {legendItems.map((item) => (
        <div key={item.key} className="rounded-lg border border-border bg-card px-3 py-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
            <div className="shrink-0">{item.badge}</div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {groups && groups.length > 0 ? (
            <div className="space-y-3">
              {groups.map((group) => {
                const expanded = expandedGroups[group.key] ?? true;
                return (
                  <section key={group.key} className="rounded-lg border border-border bg-card">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGroups((prev) => ({
                          ...prev,
                          [group.key]: !expanded,
                        }))
                      }
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                    >
                      <span className="text-sm font-semibold text-foreground">{group.title}</span>
                      {expanded ? (
                        <ChevronUp size={16} className="text-muted-foreground" />
                      ) : (
                        <ChevronDown size={16} className="text-muted-foreground" />
                      )}
                    </button>
                    {expanded && <div className="border-t border-border px-3 py-3">{renderItems(group.items)}</div>}
                  </section>
                );
              })}
            </div>
          ) : (
            renderItems(items)
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
