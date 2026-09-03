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
  <div className="flex flex-col gap-1.5 rounded-md border border-slate-300 bg-admin-surface px-4 py-3 shadow-sm">
    <div className="flex flex-col gap-1 border-b border-slate-300 px-2 py-3 pb-4">
      <h2 className="font-segoe text-lg font-semibold leading-none text-text-default">Needs Attention</h2>
      <p className="font-segoe text-[13px] font-normal leading-none text-slate-500">
        Review urgent items requiring administrative action across the system.
      </p>
    </div>

    {items.length === 0 ? (
      <div className="flex items-center gap-3 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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
            className="group flex items-center justify-between gap-3 rounded-md border-b border-slate-300 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 p-2 transition-colors group-hover:bg-bg-info-secondary">
                <Icon
                  className="h-4 w-4 text-slate-500 transition-colors group-hover:text-icon-info-secondary"
                  strokeWidth={1.6}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <p className="truncate font-segoe text-sm font-semibold leading-[120%] text-public-text-neutral-default">
                  {item.orgName}
                </p>
                <p className="truncate font-segoe text-[13px] font-normal leading-none text-public-text-neutral-default">
                  {item.actionText}
                </p>
                <p className="font-cascadia text-[10px] font-normal leading-[140%] text-slate-500">
                  {item.verb} {formatDistanceToNowStrict(new Date(item.timestamp))} ago
                </p>
              </div>
            </div>
            <ArrowUpRight
              className="h-[18px] w-[18px] shrink-0 text-text-disabled transition-colors group-hover:text-icon-info-secondary"
              strokeWidth={1.6}
            />
          </button>
        );
      })
    )}
  </div>
);
