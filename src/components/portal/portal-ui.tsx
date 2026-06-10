import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { statusLabelMap, statusToneMap } from "@/lib/lydo-connect-data";

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
  className,
}: {
  label: string;
  value: string | number;
  helper?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) => (
  <Card
    className={cn(
      "border-border/70 bg-card/90",
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
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75 leading-snug">{label}</p>
        {Icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : null}
      </div>
      <div className="mt-3 text-2xl font-semibold sm:text-3xl">{value}</div>
      {helper ? <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{helper}</p> : null}
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
        "gap-2 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 sm:gap-4",
        action ? "flex flex-col sm:flex-row sm:items-start sm:justify-between" : "block",
      )}
    >
      <div className="min-w-0">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        {description ? <CardDescription className="mt-1 text-sm">{description}</CardDescription> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
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
