import React, { useMemo } from "react";
import { AlertTriangle, CalendarDays, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRenewalClock } from "@/hooks/use-renewal-clock";
import type { UserFacingRenewalState } from "@/lib/organization-renewal";

export interface UserPortalRenewalCountdownChipProps {
  expiresAt: string;
  className?: string;
  renewalState?: UserFacingRenewalState | null;
}

export const UserPortalRenewalCountdownChip: React.FC<UserPortalRenewalCountdownChipProps> = ({
  expiresAt,
  className,
  renewalState,
}) => {
  const clock = useRenewalClock(expiresAt);

  const dueDateStr = useMemo(() => {
    const d = new Date(expiresAt);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString("en-PH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  }, [expiresAt]);

  const isDueOrExpired = clock.isDue || clock.days <= 0;
  const isExpiringSoon = clock.days <= 90;

  // Derive label and tone from authoritative renewalState if provided
  let label: string;
  let tone: "danger" | "action" | "warning" | "info" | "neutral" = "neutral";

  if (renewalState?.key === "renewal_draft") {
    label = "Renewal draft in progress";
    tone = "neutral";
  } else if (renewalState?.key === "renewal_needs_revision") {
    label = "Renewal action required";
    tone = "action";
  } else if (renewalState?.key === "renewal_submitted" || renewalState?.key === "renewal_resubmitted") {
    label = "Renewal submitted";
    tone = "info";
  } else if (renewalState?.key === "renewal_under_review") {
    label = "Renewal under review";
    tone = "info";
  } else if (renewalState?.key === "renewal_rejected") {
    label = "Renewal not approved";
    tone = "danger";
  } else if (isDueOrExpired) {
    label = renewalState?.key === "expired_within_renewal_window"
      ? "Accreditation expired (Renewal open)"
      : renewalState?.key === "expired_beyond_renewal_window"
        ? "Accreditation expired"
        : "Renewal due today";
    tone = "danger";
  } else if (clock.days === 1) {
    label = "Renewal in 1 day";
    tone = "warning";
  } else if (isExpiringSoon) {
    label = `Renewal in ${clock.days} days`;
    tone = "warning";
  } else {
    label = `Renewal in ${clock.days} days`;
    tone = "neutral";
  }

  return (
    <div
      title={dueDateStr ? `Accreditation valid until ${dueDateStr}` : undefined}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors duration-150 shadow-2xs",
        tone === "danger"
          ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
          : tone === "action"
            ? "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"
            : tone === "warning"
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
              : tone === "info"
                ? "bg-primary/10 text-primary dark:text-primary border-primary/20"
                : "bg-muted/50 text-muted-foreground border-border",
        className,
      )}
    >
      {tone === "danger" ? (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
      ) : tone === "action" ? (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />
      ) : tone === "warning" ? (
        <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
      ) : tone === "info" ? (
        <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
      ) : (
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <span>{label}</span>
    </div>
  );
};

export const RenewalCountdownChip = UserPortalRenewalCountdownChip;
