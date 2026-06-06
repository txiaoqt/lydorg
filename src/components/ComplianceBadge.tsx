import { Badge } from "@/components/ui/badge";

interface ComplianceBadgeProps {
  status: "compliant" | "pending" | "overdue";
}

const styles = {
  compliant: "bg-success/10 text-success border-success/20 hover:bg-success/10",
  pending: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/10",
  overdue: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10",
};

const labels = {
  compliant: "Compliant",
  pending: "Pending",
  overdue: "Overdue",
};

export default function ComplianceBadge({ status }: ComplianceBadgeProps) {
  return (
    <Badge variant="outline" className={styles[status]}>
      {labels[status]}
    </Badge>
  );
}
