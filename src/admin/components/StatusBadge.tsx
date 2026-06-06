import React from "react";

type StatusBadgeProps = {
  status?: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  published: "bg-success/12 text-success border-success/30",
  upcoming: "bg-primary/10 text-primary border-primary/20",
  ongoing: "bg-info/12 text-info border-info/30",
  draft: "bg-muted text-muted-foreground border-border",
  active: "bg-success/12 text-success border-success/30",
  partner: "bg-primary/10 text-primary border-primary/20",
  inactive: "bg-muted text-muted-foreground border-border",
  archived: "bg-muted text-muted-foreground border-border",
  past: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/25",
  postponed: "bg-warning/12 text-warning border-warning/30",
  completed: "bg-info/12 text-info border-info/30",
  pending: "bg-warning/12 text-warning border-warning/30",
  enabled: "bg-success/12 text-success border-success/30",
  disabled: "bg-destructive/10 text-destructive border-destructive/25",
};

const formatLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status ?? "").trim().toLowerCase();
  const style = STATUS_STYLES[normalized] ?? "bg-muted text-muted-foreground border-border";
  const label = normalized ? formatLabel(normalized) : "N/A";

  return (
    <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold text-center ${style}`}>
      {label}
    </span>
  );
}
