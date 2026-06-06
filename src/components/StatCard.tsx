import { LucideIcon } from "lucide-react";

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: LucideIcon;
  description?: string;
  variant?: "default" | "primary" | "accent" | "warning";
  compact?: boolean;
}

export default function StatCard({
  value,
  label,
  icon: Icon,
  description,
  variant = "default",
  compact = false,
}: StatCardProps) {
  if (compact) {
    return (
      <div className="text-center">
        <div className="mb-1 text-3xl font-heading font-bold text-primary-foreground sm:text-4xl md:text-5xl">
          {value}
        </div>
        <div className="text-[11px] leading-tight text-primary-foreground/70 sm:text-sm">{label}</div>
      </div>
    );
  }

  const variantStyles = {
    default: "bg-card border-border",
    primary: "bg-card border-primary/20",
    accent: "bg-card border-accent/25",
    warning: "bg-card border-warning/30",
  };

  const iconStyles = {
    default: "bg-primary/10 text-primary",
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent",
    warning: "bg-warning/10 text-warning",
  };

  return (
    <div className={`rounded-lg border p-4 sm:p-5 card-shadow transition-all duration-200 hover:card-shadow-hover ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground sm:text-sm">{label}</p>
          <p className="mt-1 text-xl font-heading font-bold sm:text-2xl">{value}</p>
          {description && <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{description}</p>}
        </div>
        {Icon && (
          <div className={`rounded-lg border border-current/15 p-2 sm:p-2.5 ${iconStyles[variant]}`}>
            <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
