import { describe, expect, it } from "vitest";
import { resolveRegistrationPrerequisites, resolveYpopWorkflowEligibility } from "./user-workflow-eligibility";
import type { OrganizationProfile, SubmissionFile, TemplateRecord } from "./lydo-connect-data";

const profile = {
  profileStatus: "pending_review",
  registrationType: "new_organization",
  urnReviewStatus: "not_applicable",
  organizationName: "Org",
  organizationEmail: "org@example.com",
  contactNumber: "09123456789",
  district: "District I",
  barangay: "Bagong Ilog",
  isExistingOrganization: false,
  organizationIdentifierNumber: "",
  majorClassification: "community_based",
  subClassification: "in_school",
  advocacies: ["education"],
  adviserName: "Adviser",
  representativeName: "Representative",
  address: "Pasig",
} as OrganizationProfile;

describe("shared user workflow eligibility", () => {
  it("blocks document access until the profile is complete", () => {
    expect(resolveRegistrationPrerequisites({
      profile: { ...profile, address: "" },
      requiredTemplates: [],
      documentFiles: [],
    }).canAccessDocuments).toBe(false);
  });

  it("requires approved documents for a new organization", () => {
    const template = { id: "doc-1" } as TemplateRecord;
    expect(resolveRegistrationPrerequisites({
      profile,
      requiredTemplates: [template],
      documentFiles: [{ documentTypeId: "doc-1", adminStatus: "approved_green" } as SubmissionFile],
    }).documentsSatisfied).toBe(true);
  });

  it("uses verified URN instead of document records for an existing organization", () => {
    expect(resolveRegistrationPrerequisites({
      profile: {
        ...profile,
        profileStatus: "verified",
        registrationType: "existing_urn",
        isExistingOrganization: true,
        urnReviewStatus: "verified",
      },
      requiredTemplates: [{ id: "doc-1" } as TemplateRecord],
      documentFiles: [],
    }).documentsSatisfied).toBe(true);
  });

  it("keeps YPOP read-only until registration verification is complete", () => {
    expect(resolveYpopWorkflowEligibility({
      profile,
      requiredTemplates: [{ id: "doc-1" } as TemplateRecord],
      documentFiles: [{ documentTypeId: "doc-1", adminStatus: "approved_green" } as SubmissionFile],
    }).canEditParticipation).toBe(false);
  });
});
