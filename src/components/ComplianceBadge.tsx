import { StatusBadge } from "@/components/portal/StatusBadge";

interface ComplianceBadgeProps {
  status: "compliant" | "pending" | "overdue";
}

export default function ComplianceBadge({ status }: ComplianceBadgeProps) {
  return <StatusBadge status={status} />;
}
