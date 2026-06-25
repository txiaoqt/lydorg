import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { statusLabelMap, statusToneMap } from "@/lib/lydo-connect-data";

const portalIconToneMap = {
  primary: "border-primary/15 bg-primary/10 text-primary",
  sky: "border-sky-500/15 bg-sky-500/10 text-sky-600",
  emerald: "border-emerald-500/15 bg-emerald-500/10 text-emerald-600",
  amber: "border-amber-500/15 bg-amber-500/10 text-amber-600",
  orange: "border-orange-500/15 bg-orange-500/10 text-orange-600",
  red: "border-red-500/15 bg-red-500/10 text-red-600",
  violet: "border-violet-500/15 bg-violet-500/10 text-violet-600",
} as const;

type PortalIconTone = keyof typeof portalIconToneMap;

export const PortalIconBadge = ({
  icon: Icon,
  tone = "primary",
  size = "md",
  className,
  iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: PortalIconTone;
  size?: "sm" | "md" | "lg";
  className?: string;
  iconClassName?: string;
}) => {
  const sizeClassName =
    size === "sm"
      ? "h-9 w-9 rounded-xl"
      : size === "lg"
        ? "h-20 w-20 rounded-full"
        : "h-11 w-11 rounded-2xl";
  const iconSizeClassName = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-10 w-10" : "h-5 w-5";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center border",
        sizeClassName,
        portalIconToneMap[tone],
        className,
      )}
    >
      <Icon className={cn(iconSizeClassName, iconClassName)} />
    </div>
  );
};

export const PortalStatusBadge = ({ status }: { status: string }) => (
  <Badge variant={statusToneMap[status] ?? "secondary"} className="capitalize">
    {statusLabelMap[status] ?? status.replaceAll("_", " ")}
  </Badge>
);

export const PortalMetricCard = ({
  label,
  value,
  helper,
  onClick,
  icon: Icon,
  iconTone = "primary",
  className,
}: {
  label: string;
  value: string | number;
  helper?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  iconTone?: PortalIconTone;
  className?: string;
}) => (
  <Card
    className={cn(
      "min-w-0 border-border/70 bg-card/90",
      onClick ? "cursor-pointer transition-transform transition-colors hover:-translate-y-0.5 hover:bg-muted/30" : "",
      className,
    )}
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onClick();
            }
          }
        : undefined
    }
  >
    <CardContent className="p-3.5 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-[11rem] break-words text-[10px] uppercase tracking-[0.1em] leading-snug text-muted-foreground/75 sm:max-w-none sm:text-xs sm:tracking-[0.16em]">
          {label}
        </p>
        {Icon ? <PortalIconBadge icon={Icon} tone={iconTone} size="sm" /> : null}
      </div>
      <div className="mt-2.5 text-[1.9rem] font-semibold leading-none sm:mt-3 sm:text-3xl">{value}</div>
      {helper ? <p className="mt-1.5 text-xs leading-snug text-muted-foreground sm:text-sm">{helper}</p> : null}
    </CardContent>
  </Card>
);

export const PortalSection = ({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <Card className="border-border/70 bg-card/90 shadow-sm">
    <CardHeader
      className={cn(
        "gap-2 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6 sm:gap-4",
        action ? "flex flex-col sm:flex-row sm:items-start sm:justify-between" : "block",
      )}
    >
      <div className="min-w-0">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        {description ? <CardDescription className="mt-1 text-sm">{description}</CardDescription> : null}
      </div>
      {action ? <div className="w-full min-w-0 sm:w-auto sm:shrink-0">{action}</div> : null}
    </CardHeader>
    <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">{children}</CardContent>
  </Card>
);

export const PortalEmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-center sm:p-6">
    <p className="font-medium">{title}</p>
    <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);
