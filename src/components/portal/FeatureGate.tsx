import React from "react";
import { WebsiteWorkflowNotice } from "./WebsiteWorkflowNotice";
import type { WorkflowRequirement } from "@/lib/user-workflow-eligibility";

export interface FeatureGateProps {
  canAccess: boolean;
  title: string;
  description: string;
  requirements: WorkflowRequirement[];
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
  heroSection?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  canAccess,
  title,
  description,
  requirements,
  actionLabel,
  onAction,
  children,
  heroSection,
}) => {
  if (!canAccess) {
    return (
      <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-4 sm:space-y-6 max-w-[1440px] mx-auto pt-0 pb-2 sm:py-2">
        {heroSection}
        <WebsiteWorkflowNotice
          title={title}
          description={description}
          requirements={requirements}
          actionLabel={actionLabel}
          onAction={onAction}
        />
      </div>
    );
  }

  return <>{children}</>;
};
