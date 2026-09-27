import { formatDistanceToNowStrict } from "date-fns";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

export type NeedsAttentionItem = {
  id: string;
  icon: LucideIcon;
  orgName: string;
  actionText: string;
  verb: "Submitted" | "Received";
  timestamp: string;
  href: string;
};

type NeedsAttentionListProps = {
  items: NeedsAttentionItem[];
  onNavigate: (href: string) => void;
};

export const NeedsAttentionList = ({ items, onNavigate }: NeedsAttentionListProps) => (
  <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
    <div className="flex flex-col gap-1 border-b border-border px-2 py-3 pb-4">
      <h2 className="font-segoe text-lg font-semibold leading-none text-foreground">Needs Attention</h2>
      <p className="font-segoe text-[13px] font-normal leading-none text-muted-foreground">
        Review urgent items requiring administrative action across the system.
      </p>
    </div>

    {items.length === 0 ? (
      <div className="flex items-center gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-300">
        All clear — no pending items right now.
      </div>
    ) : (
      items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.href)}
            className="group flex items-center justify-between gap-3 rounded-md border-b border-border px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/80 border border-border/50 text-foreground/80 transition-colors group-hover:bg-primary/15 group-hover:text-primary dark:group-hover:text-sky-300">
                <Icon
                  className="h-4 w-4 transition-colors"
                  strokeWidth={1.6}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate font-segoe text-sm font-semibold leading-[120%] text-foreground">
                  {item.orgName}
                </p>
                <p className="truncate font-segoe text-[13px] font-normal leading-none text-muted-foreground">
                  {item.actionText}
                </p>
                <p className="font-cascadia text-[10px] font-normal leading-[140%] text-muted-foreground/75">
                  {item.verb} {formatDistanceToNowStrict(new Date(item.timestamp))} ago
                </p>
              </div>
            </div>
            <ArrowUpRight
              className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary dark:group-hover:text-sky-300"
              strokeWidth={1.75}
            />
          </button>
        );
      })
    )}
  </div>
);
