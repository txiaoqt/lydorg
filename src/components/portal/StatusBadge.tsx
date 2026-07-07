import { Badge } from "@/components/ui/badge";
import { statusLabelMap } from "@/lib/lydo-connect-data";
import { cn } from "@/lib/utils";

export const statusBadgeToneClasses = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  info: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50",
  progress: "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-50",
  warning: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
  action: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-50",
  danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
  neutral: "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50",
  special: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50",
} as const;

export type StatusBadgeTone = keyof typeof statusBadgeToneClasses;

export const statusBadgeToneMap: Record<string, StatusBadgeTone> = {
  verified: "success",
  approved: "success",
  approved_green: "success",
  budget_released: "success",
  completed: "success",
  completed_liquidated: "success",
  qualified: "success",
  published: "success",
  reviewed: "success",
  resolved: "success",
  finalized: "success",
  registered: "success",
  attended: "success",
  compliant: "success",
  active: "success",

  pending_review: "info",
  under_review: "info",
  under_admin_review: "info",
  ready_for_review: "info",
  submitted: "info",
  uploaded: "info",
  pending_verification: "info",
  upcoming: "info",
  open: "info",
  in_progress: "progress",

  approved_for_ftf_green: "progress",
  hard_copy_submitted: "progress",
  confirmed: "progress",
  ongoing: "progress",

  incomplete: "warning",
  pending_activity_completion: "warning",
  pending: "warning",
  partial: "warning",
  postponed: "warning",
  received: "warning",
  due_soon: "warning",

  needs_revision: "action",
  needs_update: "action",
  needs_reupload: "action",
  needs_renewal: "action",
  action_required: "action",
  mismatch: "action",
  issue: "action",

  rejected: "danger",
  rejected_red: "danger",
  overdue: "danger",
  suspended_inactive: "danger",
  not_qualified: "danger",
  cancelled: "danger",
  late: "danger",
  missing: "danger",
  failed: "danger",
  validation_failed: "danger",
  expired: "danger",

  not_started: "neutral",
  draft: "neutral",
  draft_visibility: "neutral",
  hidden: "neutral",
  closed: "neutral",
  past: "neutral",
  archived: "neutral",
  inactive: "neutral",
  not_joined: "neutral",
  on_track: "progress",
  submit_onsite: "progress",
  enabled: "success",
  disabled: "danger",

  partner: "special",
};

const statusBadgeBaseClass =
  "inline-flex min-h-5 max-w-full items-center justify-center rounded-full border px-2 py-0.5 text-center text-[11px] font-semibold leading-tight normal-case shadow-none";

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
  size = "sm",
  className,
}: {
  status: string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const normalizedStatus = status.trim().toLowerCase().replace(/\s+/g, "_");
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
      {label ?? statusLabelMap[normalizedStatus] ?? readableFallback(status)}
    </Badge>
  );
}
