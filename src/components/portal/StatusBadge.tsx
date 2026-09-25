import { Badge } from "@/components/ui/badge";
import { isLiquidationOverdue, statusLabelMap } from "@/lib/lydo-connect-data";
import { cn } from "@/lib/utils";

export const statusBadgeToneClasses = {
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20 hover:bg-emerald-500/15",
  info: "border-primary/20 bg-primary/10 text-primary dark:text-primary dark:bg-primary/10 dark:border-primary/20 hover:bg-primary/15",
  progress: "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-400 dark:bg-teal-500/10 dark:border-teal-500/20 hover:bg-teal-500/15",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20 hover:bg-amber-500/15",
  action: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-400 dark:bg-orange-500/10 dark:border-orange-500/20 hover:bg-orange-500/15",
  danger: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20 hover:bg-rose-500/15",
  neutral: "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
  special: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-400 dark:bg-violet-500/10 dark:border-violet-500/20 hover:bg-violet-500/15",
} as const;

export type StatusBadgeTone = keyof typeof statusBadgeToneClasses;

export const statusBadgeToneMap: Record<string, StatusBadgeTone> = {
  // 1. SUCCESS — Green
  verified: "success",
  approved: "success",
  approved_green: "success",
  qualified: "success",
  completed_liquidated: "success",
  active: "success",
  published: "success",
  budget_released: "success",
  completed: "success",
  resolved: "success",
  finalized: "success",
  registered: "success",
  attended: "success",
  compliant: "success",
  enabled: "success",

  // 2. INFO / WAITING / REVIEW — Blue
  pending_review: "info",
  under_review: "info",
  under_admin_review: "info",
  ready_for_review: "info",
  submitted: "info",
  pending_evaluation: "info",
  pending_verification: "info",
  uploaded: "info",
  ocr_processing: "info",
  open: "info",
  reviewed: "info",
  upcoming: "info",
  pending: "info",

  // 3. PROGRESS / INTERMEDIATE MILESTONE — Teal
  approved_for_ftf_green: "progress",
  hard_copy_submitted: "progress",
  confirmed: "progress",
  ongoing: "progress",
  in_progress: "progress",
  on_track: "progress",
  submit_onsite: "progress",

  // 4. ACTION REQUIRED — Orange
  needs_revision: "action",
  needs_update: "action",
  needs_correction: "action",
  needs_reupload: "action",
  incomplete: "action",
  needs_renewal: "action",
  action_required: "action",
  mismatch: "action",
  issue: "action",

  // 5. WARNING / ATTENTION — Amber
  expiring_soon: "warning",
  due_soon: "warning",
  pending_activity_completion: "warning",
  invitation_pending: "warning",
  postponed: "warning",
  partial: "warning",
  received: "warning",

  // 6. DANGER / NEGATIVE — Red / Rose
  rejected: "danger",
  rejected_red: "danger",
  not_qualified: "danger",
  expired: "danger",
  overdue: "danger",
  suspended_inactive: "danger",
  suspended: "danger",
  cancelled: "danger",
  failed: "danger",
  validation_failed: "danger",
  late: "danger",
  missing: "danger",
  disabled: "danger",

  // 7. NEUTRAL — Gray
  not_started: "neutral",
  draft: "neutral",
  draft_saved: "neutral",
  draft_visibility: "neutral",
  hidden: "neutral",
  archived: "neutral",
  closed: "neutral",
  not_applicable: "neutral",
  past: "neutral",
  inactive: "neutral",
  not_joined: "neutral",

  // Special Non-Workflow Tags
  partner: "special",
};

const statusBadgeBaseClass =
  "inline-flex min-h-5 max-w-full items-center justify-center rounded-full border px-2 py-0.5 text-center text-xs font-semibold leading-tight normal-case shadow-none";

const readableFallback = (status: string) => {
  const normalized = status.trim();
  if (!normalized) return "Unknown";
  return normalized
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export function StatusBadge({
  status,
  label,
  deadlineAt,
  size = "sm",
  className,
}: {
  status: string;
  label?: string;
  deadlineAt?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const isOverdue = isLiquidationOverdue(deadlineAt, status);
  const effectiveStatus = isOverdue ? "overdue" : status;
  const normalizedStatus = effectiveStatus.trim().toLowerCase().replace(/\s+/g, "_");
  const tone = statusBadgeToneMap[normalizedStatus] ?? "neutral";

  return (
    <Badge
      variant="outline"
      className={cn(
        statusBadgeBaseClass,
        statusBadgeToneClasses[tone],
        size === "md" && "min-h-[22px] px-2.5 text-xs",
        className,
      )}
    >
      {label ?? statusLabelMap[normalizedStatus] ?? readableFallback(effectiveStatus)}
    </Badge>
  );
}
