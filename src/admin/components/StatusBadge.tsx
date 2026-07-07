import { StatusBadge as SharedStatusBadge } from "@/components/portal/StatusBadge";

export function StatusBadge({ status }: { status?: string | null }) {
  return <SharedStatusBadge status={status?.trim().toLowerCase() || "unknown"} />;
}
