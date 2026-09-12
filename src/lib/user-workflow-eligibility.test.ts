import { describe, expect, it } from "vitest";
import {
  isMatchingFileForTemplate,
  isRegistrationRequirementTemplate,
  resolveRegistrationPrerequisites,
  resolveYpopWorkflowEligibility,
} from "./user-workflow-eligibility";
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

const createYorpTemplate = (
  id: string,
  databaseId: string,
  name: string,
  overrides?: Partial<TemplateRecord>,
): TemplateRecord => ({
  id,
  databaseId,
  name,
  description: `Description for ${name}`,
  templateUrl: `storage://${id}.pdf`,
  sortOrder: 1,
  isRequired: true,
  isActive: true,
  scope: "registration",
  templateScope: "document_submission",
  templateDescription: `Template description for ${name}`,
  templateActive: true,
  templateFileName: `${id}.pdf`,
  templateFileUrl: `storage://${id}.pdf`,
  templateFileType: "application/pdf",
  templateUploadedAt: "2026-01-01T00:00:00Z",
  templateCategories: ["yorp"],
  templateFileSize: 1024,
  ...overrides,
});

const createSubmissionFile = (
  documentTypeId: string,
  adminStatus: string,
  overrides?: Partial<SubmissionFile>,
): SubmissionFile => ({
  id: `file-${documentTypeId}`,
  submissionId: "sub-1",
  documentTypeId,
  fileName: `file-${documentTypeId}.pdf`,
  fileUrl: `https://storage.example.com/${documentTypeId}.pdf`,
  fileType: "application/pdf",
  fileSize: 1024,
  validationStatus: "correct",
  adminStatus: adminStatus as any,
  adminRemarks: "",
  revisionHistory: [],
  uploadedAt: "2026-01-01T00:00:00Z",
  reviewedAt: "2026-01-02T00:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  ...overrides,
});

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

  // TEST A — CURRENT BASELINE
  it("TEST A — 5 applicable YORP registration templates with 5 approved files are satisfied", () => {
    const templates = [
      createYorpTemplate("cbl", "uuid-1", "Constitution and By-Laws"),
      createYorpTemplate("form-b", "uuid-2", "NYC YORP Registration Form (Form B)"),
      createYorpTemplate("officers", "uuid-3", "YORP Directory of Officers and Adviser"),
      createYorpTemplate("members", "uuid-4", "YORP List of Members in Good Standing"),
      createYorpTemplate("form-a", "uuid-5", "Pasig City YORP Registration Form (Form A)"),
    ];
    const files = templates.map((t) => createSubmissionFile(t.databaseId, "approved"));

    const result = resolveRegistrationPrerequisites({
      profile,
      requiredTemplates: templates,
      documentFiles: files,
    });

    expect(templates.length).toBe(5);
    expect(result.approvedDocuments).toBe(5);
    expect(result.documentsSatisfied).toBe(true);
  });

  // TEST B — LEGACY SLUG + UUID DATABASE ID MATCHING
  it("TEST B — matches file with database UUID against template with slug id and UUID databaseId", () => {
    const template = createYorpTemplate(
      "constitution-bylaws",
      "2377a066-1111-4000-8000-000000000001",
      "Constitution and By-Laws",
    );
    const file = createSubmissionFile(
      "2377a066-1111-4000-8000-000000000001",
      "approved",
    );

    expect(isMatchingFileForTemplate(file, template)).toBe(true);

    const result = resolveRegistrationPrerequisites({
      profile,
      requiredTemplates: [template],
      documentFiles: [file],
    });

    expect(result.approvedDocuments).toBe(1);
    expect(result.documentsSatisfied).toBe(true);
  });

  // TEST C — APPROVED_GREEN
  it("TEST C — adminStatus approved_green counts as approved", () => {
    const template = createYorpTemplate("cbl", "uuid-cbl", "Constitution and By-Laws");
    const file = createSubmissionFile("uuid-cbl", "approved_green");

    const result = resolveRegistrationPrerequisites({
      profile,
      requiredTemplates: [template],
      documentFiles: [file],
    });

    expect(result.approvedDocuments).toBe(1);
    expect(result.documentsSatisfied).toBe(true);
  });

  // TEST D — NEEDS REVISION
  it("TEST D — 4 approved and 1 needs_revision evaluates to documentsSatisfied = false", () => {
    const templates = [
      createYorpTemplate("cbl", "uuid-1", "Constitution and By-Laws"),
      createYorpTemplate("form-b", "uuid-2", "NYC YORP Registration Form (Form B)"),
      createYorpTemplate("officers", "uuid-3", "YORP Directory of Officers and Adviser"),
      createYorpTemplate("members", "uuid-4", "YORP List of Members in Good Standing"),
      createYorpTemplate("form-a", "uuid-5", "Pasig City YORP Registration Form (Form A)"),
    ];
    const files = [
      createSubmissionFile("uuid-1", "approved"),
      createSubmissionFile("uuid-2", "approved"),
      createSubmissionFile("uuid-3", "approved"),
      createSubmissionFile("uuid-4", "approved"),
      createSubmissionFile("uuid-5", "needs_revision"),
    ];

    const result = resolveRegistrationPrerequisites({
      profile,
      requiredTemplates: templates,
      documentFiles: files,
    });

    expect(result.approvedDocuments).toBe(4);
    expect(result.documentsSatisfied).toBe(false);
  });

  // TEST E — PENDING REVIEW
  it("TEST E — 4 approved and 1 submitted/under_admin_review evaluates to documentsSatisfied = false", () => {
    const templates = [
      createYorpTemplate("cbl", "uuid-1", "Constitution and By-Laws"),
      createYorpTemplate("form-b", "uuid-2", "NYC YORP Registration Form (Form B)"),
      createYorpTemplate("officers", "uuid-3", "YORP Directory of Officers and Adviser"),
      createYorpTemplate("members", "uuid-4", "YORP List of Members in Good Standing"),
      createYorpTemplate("form-a", "uuid-5", "Pasig City YORP Registration Form (Form A)"),
    ];
    const files = [
      createSubmissionFile("uuid-1", "approved"),
      createSubmissionFile("uuid-2", "approved"),
      createSubmissionFile("uuid-3", "approved"),
      createSubmissionFile("uuid-4", "approved"),
      createSubmissionFile("uuid-5", "under_admin_review"),
    ];

    const result = resolveRegistrationPrerequisites({
      profile,
      requiredTemplates: templates,
      documentFiles: files,
    });

    expect(result.approvedDocuments).toBe(4);
    expect(result.documentsSatisfied).toBe(false);
  });

  // TEST F — REJECTED
  it("TEST F — 4 approved and 1 rejected evaluates to documentsSatisfied = false", () => {
    const templates = [
      createYorpTemplate("cbl", "uuid-1", "Constitution and By-Laws"),
      createYorpTemplate("form-b", "uuid-2", "NYC YORP Registration Form (Form B)"),
      createYorpTemplate("officers", "uuid-3", "YORP Directory of Officers and Adviser"),
      createYorpTemplate("members", "uuid-4", "YORP List of Members in Good Standing"),
      createYorpTemplate("form-a", "uuid-5", "Pasig City YORP Registration Form (Form A)"),
    ];
    const files = [
      createSubmissionFile("uuid-1", "approved"),
      createSubmissionFile("uuid-2", "approved"),
      createSubmissionFile("uuid-3", "approved"),
      createSubmissionFile("uuid-4", "approved"),
      createSubmissionFile("uuid-5", "rejected"),
    ];

    const result = resolveRegistrationPrerequisites({
      profile,
      requiredTemplates: templates,
      documentFiles: files,
    });

    expect(result.approvedDocuments).toBe(4);
    expect(result.documentsSatisfied).toBe(false);
  });

  // TEST G — ADMIN REMOVES ONE
  it("TEST G — removing one template decreases required count and satisfies eligibility with remaining approved", () => {
    const initialTemplates = [
      createYorpTemplate("cbl", "uuid-1", "Constitution and By-Laws"),
      createYorpTemplate("form-b", "uuid-2", "NYC YORP Registration Form (Form B)"),
      createYorpTemplate("officers", "uuid-3", "YORP Directory of Officers and Adviser"),
      createYorpTemplate("members", "uuid-4", "YORP List of Members in Good Standing"),
      createYorpTemplate("form-a", "uuid-5", "Pasig City YORP Registration Form (Form A)"),
    ];
    // Admin archives/deactivates template 5
    const remainingTemplates = initialTemplates.slice(0, 4);
    const files = remainingTemplates.map((t) => createSubmissionFile(t.databaseId, "approved"));

    const result = resolveRegistrationPrerequisites({
      profile,
      requiredTemplates: remainingTemplates,
      documentFiles: files,
    });

    expect(remainingTemplates.length).toBe(4);
    expect(result.approvedDocuments).toBe(4);
    expect(result.documentsSatisfied).toBe(true);
  });

  // TEST H — ADMIN ADDS ONE
  it("TEST H — adding a new template increases required count to 6 and gate locks until new is approved", () => {
    const templates = [
      createYorpTemplate("cbl", "uuid-1", "Constitution and By-Laws"),
      createYorpTemplate("form-b", "uuid-2", "NYC YORP Registration Form (Form B)"),
      createYorpTemplate("officers", "uuid-3", "YORP Directory of Officers and Adviser"),
      createYorpTemplate("members", "uuid-4", "YORP List of Members in Good Standing"),
      createYorpTemplate("form-a", "uuid-5", "Pasig City YORP Registration Form (Form A)"),
      createYorpTemplate("uuid-new", "uuid-new", "New Dynamic YORP Document"),
    ];
    // Only first 5 are approved
    const files = templates.slice(0, 5).map((t) => createSubmissionFile(t.databaseId, "approved"));

    const result = resolveRegistrationPrerequisites({
      profile,
      requiredTemplates: templates,
      documentFiles: files,
    });

    expect(templates.length).toBe(6);
    expect(result.approvedDocuments).toBe(5);
    expect(result.documentsSatisfied).toBe(false);
  });

  // TEST I — NEW TEMPLATE APPROVED
  it("TEST I — once the 6th template is approved, eligibility becomes complete", () => {
    const templates = [
      createYorpTemplate("cbl", "uuid-1", "Constitution and By-Laws"),
      createYorpTemplate("form-b", "uuid-2", "NYC YORP Registration Form (Form B)"),
      createYorpTemplate("officers", "uuid-3", "YORP Directory of Officers and Adviser"),
      createYorpTemplate("members", "uuid-4", "YORP List of Members in Good Standing"),
      createYorpTemplate("form-a", "uuid-5", "Pasig City YORP Registration Form (Form A)"),
      createYorpTemplate("uuid-new", "uuid-new", "New Dynamic YORP Document"),
    ];
    const files = templates.map((t) => createSubmissionFile(t.databaseId, "approved"));

    const result = resolveRegistrationPrerequisites({
      profile,
      requiredTemplates: templates,
      documentFiles: files,
    });

    expect(templates.length).toBe(6);
    expect(result.approvedDocuments).toBe(6);
    expect(result.documentsSatisfied).toBe(true);
  });

  // TEST J — DATA FORM IGNORED
  it("TEST J — data form templates without YORP category are excluded from registration requirements", () => {
    const dataFormTemplate = createYorpTemplate("df-1", "uuid-df-1", "PCYDO Data Form", {
      templateCategories: ["data_form"],
    });
    expect(isRegistrationRequirementTemplate(dataFormTemplate)).toBe(false);
  });

  // TEST K — MOVE IGNORED
  it("TEST K — MOVE templates are excluded from registration requirements", () => {
    const moveTemplate = createYorpTemplate("move-1", "uuid-move-1", "MOVE Application Form", {
      templateCategories: ["move"],
      templateScope: "other",
    });
    expect(isRegistrationRequirementTemplate(moveTemplate)).toBe(false);
  });

  // TEST L — RENEWAL-ONLY IGNORED
  it("TEST L — renewal-only templates are excluded from registration requirements", () => {
    const renewalTemplate = createYorpTemplate("ren-1", "uuid-ren-1", "Annual Accomplishment Report", {
      scope: "renewal",
    });
    expect(isRegistrationRequirementTemplate(renewalTemplate)).toBe(false);
  });

  // TEST M — USER PORTAL PARITY
  it("TEST M — User Portal templateDocuments filter identifies same templates as isRegistrationRequirementTemplate", () => {
    const allTemplates = [
      createYorpTemplate("cbl", "uuid-1", "Constitution and By-Laws"),
      createYorpTemplate("form-b", "uuid-2", "NYC YORP Registration Form (Form B)"),
      createYorpTemplate("officers", "uuid-3", "YORP Directory of Officers and Adviser"),
      createYorpTemplate("members", "uuid-4", "YORP List of Members in Good Standing"),
      createYorpTemplate("form-a", "uuid-5", "Pasig City YORP Registration Form (Form A)"),
      createYorpTemplate("move-guide", "uuid-6", "MOVE Guidelines", { templateCategories: ["move"], templateScope: "other" }),
      createYorpTemplate("renewal-doc", "uuid-7", "Renewal Only Form", { scope: "renewal" }),
      createYorpTemplate("inactive-doc", "uuid-8", "Archived Form", { isActive: false }),
    ];

    const filtered = allTemplates.filter(isRegistrationRequirementTemplate);
    expect(filtered.length).toBe(5);
    expect(filtered.map((t) => t.id)).toEqual(["cbl", "form-b", "officers", "members", "form-a"]);
  });

  // TEST N — PWA PARITY
  it("TEST N — PWA requirement selection matches the same applicable templates and interprets approved files identically", () => {
    const allTemplates = [
      createYorpTemplate("constitution-bylaws", "uuid-cbl", "Constitution and By-Laws"),
      createYorpTemplate("yorp-form-b", "uuid-form-b", "NYC YORP Registration Form (Form B)"),
      createYorpTemplate("pcydo-data", "uuid-df", "Data Form", { templateCategories: ["data_form"] }),
    ];

    const pwaRequiredTemplates = allTemplates.filter(isRegistrationRequirementTemplate);
    expect(pwaRequiredTemplates.length).toBe(2);

    const files = [
      createSubmissionFile("uuid-cbl", "approved"),
      createSubmissionFile("uuid-form-b", "approved"),
    ];

    const matchingFiles = pwaRequiredTemplates
      .map((template) => files.find((f) => isMatchingFileForTemplate(f, template)))
      .filter((f): f is NonNullable<typeof f> => Boolean(f));

    expect(matchingFiles.length).toBe(2);

    const result = resolveRegistrationPrerequisites({
      profile,
      requiredTemplates: pwaRequiredTemplates,
      documentFiles: files,
    });
    expect(result.documentsSatisfied).toBe(true);
  });

  // TEST O — USER REFRESH
  it("TEST O — recalculates dynamically when template and file states change across renders", () => {
    const template1 = createYorpTemplate("cbl", "uuid-1", "Constitution and By-Laws");
    const template2 = createYorpTemplate("form-b", "uuid-2", "NYC YORP Registration Form (Form B)");

    // Initial state: 2 templates, 1 approved
    const filesInitial = [createSubmissionFile("uuid-1", "approved")];
    const initialResult = resolveRegistrationPrerequisites({
      profile,
      requiredTemplates: [template1, template2],
      documentFiles: filesInitial,
    });
    expect(initialResult.documentsSatisfied).toBe(false);

    // After refresh / file upload approved
    const filesUpdated = [
      createSubmissionFile("uuid-1", "approved"),
      createSubmissionFile("uuid-2", "approved"),
    ];
    const updatedResult = resolveRegistrationPrerequisites({
      profile,
      requiredTemplates: [template1, template2],
      documentFiles: filesUpdated,
    });
    expect(updatedResult.documentsSatisfied).toBe(true);
  });
});

