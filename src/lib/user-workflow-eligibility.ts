import {
  deriveTemplateCategory,
  type BudgetRequest,
  type OrganizationProfile,
  type SubmissionFile,
  type TemplateRecord,
} from "./lydo-connect-data";
import type { BudgetEligibility } from "./budget-eligibility";
import { isOrganizationProfileComplete } from "./organization-profile-domain";
import { isUrnRegistration } from "./urn-registration";

const approvedDocumentStatuses = new Set(["approved", "approved_green"]);
const releasedBudgetStatuses = new Set(["budget_released"]);

export type WorkflowRequirement = {
  id: "profile" | "registration" | "documents" | "ypop_participation" | "ypop_qualification" | "budget_released" | "activity_completed" | "liquidation";
  label: string;
  met: boolean;
};

export function isDocumentSubmissionRequirementTemplate(
  template: TemplateRecord,
  workflowScope: "registration" | "renewal",
): boolean {
  const isActive = (template.templateActive ?? true) && template.isActive !== false;
  if (!isActive) return false;
  if (template.templateScope !== "document_submission") return false;

  const rawCategories =
    Array.isArray(template.templateCategories) && template.templateCategories.length > 0
      ? template.templateCategories
      : (template as any).template_category && Array.isArray((template as any).template_category)
      ? (template as any).template_category
      : (template as any).category
      ? [(template as any).category]
      : [];
  const effectiveRawCategories =
    rawCategories.length > 0 ? rawCategories : [deriveTemplateCategory(template.name)];
  const categories = effectiveRawCategories.map((cat: string) => String(cat).trim().toLowerCase());
  if (!categories.includes("yorp")) return false;

  const scope = template.scope;
  return !scope || scope === workflowScope || scope === "both";
}

export function isRegistrationRequirementTemplate(template: TemplateRecord): boolean {
  return isDocumentSubmissionRequirementTemplate(template, "registration");
}

export function isRenewalRequirementTemplate(template: TemplateRecord): boolean {
  return isDocumentSubmissionRequirementTemplate(template, "renewal");
}

export const isMatchingFileForTemplate = (
  file: SubmissionFile,
  template: TemplateRecord,
): boolean =>
  file.documentTypeId === template.id ||
  (Boolean(template.databaseId) && file.documentTypeId === template.databaseId);

export function isOrganizationSuspended({
  profile,
  documentFiles,
}: {
  profile?: OrganizationProfile | null;
  documentFiles?: SubmissionFile[];
}): boolean {
  if (profile?.profileStatus === "suspended_inactive") return true;
  if (documentFiles && documentFiles.some((file) => file.adminStatus === "rejected_red")) {
    return true;
  }
  return false;
}

export function resolveRegistrationPrerequisites({
  profile,
  requiredTemplates,
  documentFiles,
}: {
  profile?: OrganizationProfile | null;
  requiredTemplates: TemplateRecord[];
  documentFiles: SubmissionFile[];
}) {
  const isSuspended = isOrganizationSuspended({ profile, documentFiles });
  const profileComplete = !isSuspended && isOrganizationProfileComplete(profile);
  const registrationVerified = !isSuspended && profile?.profileStatus === "verified";
  const urnRegistration = isUrnRegistration(profile);
  const approvedDocuments = isSuspended
    ? 0
    : requiredTemplates.filter((template) =>
        documentFiles.some(
          (file) =>
            isMatchingFileForTemplate(file, template) &&
            approvedDocumentStatuses.has(file.adminStatus),
        ),
      ).length;
  const documentsSatisfied =
    !isSuspended &&
    (urnRegistration
      ? profile?.urnReviewStatus === "verified"
      : requiredTemplates.length > 0 && approvedDocuments === requiredTemplates.length);

  return {
    isSuspended,
    profileComplete,
    registrationVerified,
    urnRegistration,
    approvedDocuments,
    documentsSatisfied,
    canAccessDocuments: !isSuspended && profileComplete,
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
  // Renewal approval issues/renews the official URN and verifies the profile,
  // while its files live in the renewal packet rather than the original
  // registration submission. Treat that completed verification as satisfying
  // YPOP's document prerequisite too.
  const verifiedAccreditation = Boolean(
    !registration.isSuspended &&
      profile?.profileStatus === "verified" &&
      profile.urnReviewStatus === "verified" &&
      profile.urn?.trim(),
  );
  const requirements: WorkflowRequirement[] = [
    { id: "profile", label: "Complete organization profile", met: registration.profileComplete },
    { id: "registration", label: "Organization verification", met: registration.registrationVerified },
    {
      id: "documents",
      label: registration.urnRegistration ? "URN verification" : "Required documents",
      met: registration.documentsSatisfied || verifiedAccreditation,
    },
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
  const isLiquidationAvailable = hasLiquidation || Boolean(releasedBudget);
  const requirements: WorkflowRequirement[] = [
    { id: "profile", label: "Complete organization profile", met: registration.profileComplete },
    { id: "registration", label: "Organization verified", met: registration.registrationVerified },
    { id: "budget_released", label: "Budget approved and released", met: Boolean(releasedBudget) },
    { id: "liquidation", label: "Liquidation report available", met: isLiquidationAvailable },
  ];
  return {
    ...registration,
    requirements,
    releasedBudget,
    eligible: registration.profileComplete && registration.registrationVerified && Boolean(releasedBudget),
  };
}
