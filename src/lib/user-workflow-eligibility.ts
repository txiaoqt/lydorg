import type {
  BudgetRequest,
  OrganizationProfile,
  SubmissionFile,
  TemplateRecord,
} from "./lydo-connect-data";
import type { BudgetEligibility } from "./budget-eligibility";
import { isOrganizationProfileComplete } from "./organization-profile-domain";
import { isUrnRegistration } from "./urn-registration";

const approvedDocumentStatuses = new Set(["approved", "approved_green"]);
const releasedBudgetStatuses = new Set(["budget_released", "completed"]);

export type WorkflowRequirement = {
  id: "profile" | "registration" | "documents" | "ypop_participation" | "ypop_qualification" | "budget_released" | "activity_completed" | "liquidation";
  label: string;
  met: boolean;
};

export function resolveRegistrationPrerequisites({
  profile,
  requiredTemplates,
  documentFiles,
}: {
  profile?: OrganizationProfile | null;
  requiredTemplates: TemplateRecord[];
  documentFiles: SubmissionFile[];
}) {
  const profileComplete = isOrganizationProfileComplete(profile);
  const registrationVerified = profile?.profileStatus === "verified";
  const urnRegistration = isUrnRegistration(profile);
  const approvedDocuments = requiredTemplates.filter((template) =>
    documentFiles.some(
      (file) =>
        file.documentTypeId === template.id &&
        approvedDocumentStatuses.has(file.adminStatus),
    ),
  ).length;
  const documentsSatisfied =
    urnRegistration
      ? profile?.urnReviewStatus === "verified"
      : requiredTemplates.length > 0 && approvedDocuments === requiredTemplates.length;

  return {
    profileComplete,
    registrationVerified,
    urnRegistration,
    approvedDocuments,
    documentsSatisfied,
    canAccessDocuments: profileComplete,
  };
}

export function resolveBudgetWorkflowEligibility({
  profile,
  requiredTemplates,
  documentFiles,
  ypopEligibility,
}: {
  profile?: OrganizationProfile | null;
  requiredTemplates: TemplateRecord[];
  documentFiles: SubmissionFile[];
  ypopEligibility: BudgetEligibility;
}) {
  const registration = resolveRegistrationPrerequisites({
    profile,
    requiredTemplates,
    documentFiles,
  });
  const requirements: WorkflowRequirement[] = [
    { id: "profile", label: "Complete organization profile", met: registration.profileComplete },
    { id: "registration", label: "Organization verification", met: registration.registrationVerified },
    { id: "documents", label: registration.urnRegistration ? "URN verification" : "Required documents", met: registration.documentsSatisfied },
    {
      id: "ypop_participation",
      label: "Active YPOP participation",
      met: Boolean(ypopEligibility.period && ypopEligibility.entry),
    },
    { id: "ypop_qualification", label: "YPOP qualification", met: ypopEligibility.eligible },
  ];
  return {
    ...registration,
    requirements,
    eligible: requirements.every((requirement) => requirement.met),
  };
}

export function resolveYpopWorkflowEligibility({
  profile,
  requiredTemplates,
  documentFiles,
}: {
  profile?: OrganizationProfile | null;
  requiredTemplates: TemplateRecord[];
  documentFiles: SubmissionFile[];
}) {
  const registration = resolveRegistrationPrerequisites({
    profile,
    requiredTemplates,
    documentFiles,
  });
  const requirements: WorkflowRequirement[] = [
    { id: "profile", label: "Complete organization profile", met: registration.profileComplete },
    { id: "registration", label: "Organization verification", met: registration.registrationVerified },
    { id: "documents", label: registration.urnRegistration ? "URN verification" : "Required documents", met: registration.documentsSatisfied },
  ];
  return {
    ...registration,
    requirements,
    canEditParticipation: requirements.every((requirement) => requirement.met),
  };
}

export function resolveLiquidationWorkflowEligibility({
  profile,
  requiredTemplates,
  documentFiles,
  budgetRequests,
  hasLiquidation,
}: {
  profile?: OrganizationProfile | null;
  requiredTemplates: TemplateRecord[];
  documentFiles: SubmissionFile[];
  budgetRequests: BudgetRequest[];
  hasLiquidation: boolean;
}) {
  const registration = resolveRegistrationPrerequisites({
    profile,
    requiredTemplates,
    documentFiles,
  });
  const releasedBudget = budgetRequests.find((request) => releasedBudgetStatuses.has(request.status)) ?? null;
  const completedActivityBudget = budgetRequests.find((request) => request.status === "completed") ?? null;
  const requirements: WorkflowRequirement[] = [
    { id: "profile", label: "Complete organization profile", met: registration.profileComplete },
    { id: "registration", label: "Organization verified", met: registration.registrationVerified },
    { id: "budget_released", label: "Budget approved and released", met: Boolean(releasedBudget) },
    { id: "activity_completed", label: "Activity completed", met: Boolean(completedActivityBudget) },
    { id: "liquidation", label: "Liquidation available", met: hasLiquidation },
  ];
  return {
    ...registration,
    requirements,
    releasedBudget,
    completedActivityBudget,
    eligible: requirements.slice(0, -1).every((requirement) => requirement.met),
  };
}
