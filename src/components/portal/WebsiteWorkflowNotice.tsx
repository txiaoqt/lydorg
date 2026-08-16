import React from "react";
import { ClipboardList, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WorkflowRequirement } from "@/lib/user-workflow-eligibility";

export interface WebsiteWorkflowNoticeProps {
  title: string;
  description: string;
  requirements: WorkflowRequirement[];
  actionLabel: string;
  onAction: () => void;
}

export const WebsiteWorkflowNotice: React.FC<WebsiteWorkflowNoticeProps> = ({
  title,
  description,
  requirements,
  actionLabel,
  onAction,
}) => (
  <Card className="border-amber-300/70 bg-amber-50/70 dark:bg-amber-500/10 dark:border-amber-500/20 shadow-sm rounded-2xl">
    <CardContent className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-100 dark:bg-amber-500/20 p-2 text-amber-700 dark:text-amber-400 shrink-0">
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-bold text-amber-950 dark:text-amber-200">{title}</h2>
          <p className="mt-1 text-xs sm:text-sm text-amber-900/90 dark:text-muted-foreground leading-relaxed">{description}</p>
          <ul className="mt-4 space-y-2" aria-label="Eligibility requirements">
            {requirements.map((requirement) => (
              <li
                key={requirement.id}
                className={cn(
                  "flex items-center gap-2 text-xs sm:text-sm font-medium",
                  requirement.met ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                )}
              >
                {requirement.met ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                )}
                <span>{requirement.label}</span>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="ghost"
            className="mt-4 h-9 px-0 text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-400 hover:bg-transparent hover:text-amber-950 dark:hover:text-amber-300 cursor-pointer"
            onClick={onAction}
          >
            {actionLabel}
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);
