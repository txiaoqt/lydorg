import { Info } from "lucide-react";
import { getBudgetRequestStatusLabel } from "@/lib/lydo-connect-data";

type StatusMessage = { title: string; description: string };

export function PortalWorkflowStatusHelper({ workflow, status }: {
  workflow: "budget" | "liquidation";
  status: string;
}) {
  let message: StatusMessage | undefined;

  if (workflow === "budget") {
    const label = getBudgetRequestStatusLabel(status);
    if (status === "awaiting_release" || label === "Awaiting Release") {
      message = {
        title: "Awaiting fund release",
        description: "Your budget request is approved and is awaiting fund release. Wait until the status changes to Budget Released before visiting the Accounting Office to claim your funds.",
      };
    } else if (label === "Budget Released") {
      message = {
        title: "Next step: Claim your funds onsite",
        description: "Your funds are ready to claim. Please visit the Accounting Office onsite to collect your released funds.",
      };
    }
  } else if (status === "approved_for_ftf_green") {
    message = {
      title: "Next step: Submit the signed hard copy",
      description: "Your report is approved. Please bring the signed hard copy to the PCYDO office. PCYDO will finalize your liquidation after receiving it.",
    };
  } else if (status === "completed_liquidated") {
    message = {
      title: "Liquidation complete",
      description: "PCYDO has finalized your liquidation report. The reporting requirements for this budget are complete.",
    };
  }

  if (!message) return null;

  return (
    <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100 sm:p-4">
      <div className="flex items-start gap-2 text-sm font-bold sm:text-xs">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300 sm:mt-0" />
        <span>{message.title}</span>
      </div>
      <p className="mt-1 pl-6 text-sm leading-relaxed text-sky-900/90 dark:text-sky-100/90 sm:text-xs">
        {message.description}
      </p>
    </div>
  );
}
