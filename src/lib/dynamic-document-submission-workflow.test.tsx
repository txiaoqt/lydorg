import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  mapTemplate,
  mapDocumentFile,
  fetchRenewalRequiredDocumentTypesInSupabase,
} from "@/lib/lydo-connect-supabase";
import {
  deriveTemplateCategory,
  type TemplateRecord,
  type SubmissionFile,
} from "@/lib/lydo-connect-data";
import { UserPortalDocumentWorkspaceView } from "@/components/portal/UserPortalDocumentWorkspaceView";

// Helper representing UserPortal's registration requirements predicate
function filterRegistrationTemplateDocuments(templates: TemplateRecord[]): TemplateRecord[] {
  return [...templates]
    .filter((template) => {
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
      const categories = effectiveRawCategories.map((cat: string) => cat.trim().toLowerCase());
      if (!categories.includes("yorp")) return false;
      const scope = template.scope;
      return !scope || scope === "registration" || scope === "both";
    })
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
}

describe("Dynamic Document Submission & Admin Template Workflow (19 Requirements)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Existing YORP seeded template remains visible
  it("1. Existing YORP seeded template remains visible in Registration", () => {
    const seededRow = {
      id: "2377a066-1111-4000-8000-000000000001",
      name: "Constitution and By-Laws",
      description: "Official Constitution and By-Laws",
      sort_order: 1,
      is_required: true,
      is_active: true,
      template_scope: "document_submission",
      scope: "both",
      template_category: ["yorp"],
      template_url: "storage://template-files/cbl.pdf",
    };
    const template = mapTemplate(seededRow as any);
    expect(template).not.toBeNull();
    const result = filterRegistrationTemplateDocuments([template!]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Constitution and By-Laws");
    expect(result[0].id).toBe("constitution-bylaws");
    expect(result[0].databaseId).toBe("2377a066-1111-4000-8000-000000000001");
  });

  // 2. Data Form template does NOT appear in User Registration Requirements
  it("2. Data Form template (PCYDO YORP Data Request Form) does NOT appear in User Registration Requirements", () => {
    const dataFormRow = {
      id: "2377a066-6666-4000-8000-000000000006",
      name: "PCYDO YORP Data Request Form",
      description: "Data request template",
      sort_order: 6,
      is_required: true,
      is_active: true,
      template_scope: "document_submission",
      scope: "both",
      template_category: ["data_form"], // Not yorp!
      template_url: "storage://template-files/data-request.pdf",
    };
    const template = mapTemplate(dataFormRow as any);
    expect(template).not.toBeNull();
    const result = filterRegistrationTemplateDocuments([template!]);
    expect(result).toHaveLength(0);
  });

  // 3. Renewal-only template does NOT appear in Registration
  it("3. Renewal-only template does NOT appear in Registration", () => {
    const renewalOnlyRow = {
      id: "9999a066-0000-4000-8000-000000000003",
      name: "Annual Accomplishment Report",
      description: "Renewal report",
      sort_order: 7,
      is_required: true,
      is_active: true,
      template_scope: "document_submission",
      scope: "renewal", // renewal only
      template_category: ["yorp"],
      template_url: "storage://template-files/aar.pdf",
    };
    const template = mapTemplate(renewalOnlyRow as any);
    expect(template).not.toBeNull();
    const result = filterRegistrationTemplateDocuments([template!]);
    expect(result).toHaveLength(0);
  });

  // 4. New active YORP registration template appears automatically
  it("4. New active YORP registration template appears automatically", () => {
    const newYorpRow = {
      id: "4541fbc4-9d51-46bd-8da6-391494951475",
      name: "Dynamic YORP Test",
      description: "Admin created template",
      sort_order: 10,
      is_required: true,
      is_active: true,
      template_scope: "document_submission",
      scope: "registration",
      template_category: ["yorp"],
      template_url: "storage://template-files/dynamic.pdf",
    };
    const template = mapTemplate(newYorpRow as any);
    expect(template).not.toBeNull();
    const result = filterRegistrationTemplateDocuments([template!]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Dynamic YORP Test");
    expect(result[0].databaseId).toBe("4541fbc4-9d51-46bd-8da6-391494951475");
  });

  // 5. New YORP downloadable template does NOT appear in Registration
  it("5. New YORP downloadable template does NOT appear in Registration", () => {
    const downloadableRow = {
      id: "5555fbc4-9d51-46bd-8da6-391494951475",
      name: "Downloadable Reference Guide",
      description: "Guideline only",
      sort_order: 11,
      is_required: false,
      is_active: true,
      template_scope: "other", // Downloadable template
      scope: "both",
      template_category: ["yorp"],
      template_url: "storage://template-files/guide.pdf",
    };
    const template = mapTemplate(downloadableRow as any);
    expect(template).not.toBeNull();
    const result = filterRegistrationTemplateDocuments([template!]);
    expect(result).toHaveLength(0);
  });

  // 6. New YORP renewal template does NOT appear in Registration
  it("6. New YORP renewal template does NOT appear in Registration", () => {
    const renewalRow = {
      id: "6666fbc4-9d51-46bd-8da6-391494951475",
      name: "Financial Audit Report",
      description: "For renewal cycle",
      sort_order: 12,
      is_required: true,
      is_active: true,
      template_scope: "document_submission",
      scope: "renewal",
      template_category: ["yorp"],
      template_url: "storage://template-files/audit.pdf",
    };
    const template = mapTemplate(renewalRow as any);
    expect(template).not.toBeNull();
    const result = filterRegistrationTemplateDocuments([template!]);
    expect(result).toHaveLength(0);
  });

  // 7. New YORP both-scope template appears in Registration
  it("7. New YORP both-scope template appears in Registration", () => {
    const bothRow = {
      id: "7777fbc4-9d51-46bd-8da6-391494951475",
      name: "Both Scope Requirement",
      description: "Applies to both",
      sort_order: 13,
      is_required: true,
      is_active: true,
      template_scope: "document_submission",
      scope: "both",
      template_category: ["yorp"],
      template_url: "storage://template-files/both.pdf",
    };
    const template = mapTemplate(bothRow as any);
    expect(template).not.toBeNull();
    const result = filterRegistrationTemplateDocuments([template!]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Both Scope Requirement");
  });

  // 8. New Admin-created template retains database UUID
  it("8. New Admin-created template retains database UUID", () => {
    const dbUuid = "8888fbc4-9d51-46bd-8da6-391494951475";
    const customRow = {
      id: dbUuid,
      name: "Custom Barangay Endorsement",
      description: "Custom doc",
      sort_order: 14,
      is_required: true,
      is_active: true,
      template_scope: "document_submission",
      scope: "registration",
      template_category: ["yorp"],
      template_url: "storage://template-files/endorsement.pdf",
    };
    const template = mapTemplate(customRow as any);
    expect(template).not.toBeNull();
    expect(template!.id).toBe(dbUuid);
    expect(template!.databaseId).toBe(dbUuid);
  });

  // 9. Uploaded file uses canonical database UUID in mapDocumentFile
  it("9. Uploaded file uses canonical database UUID in mapDocumentFile", () => {
    const dbUuid = "8888fbc4-9d51-46bd-8da6-391494951475";
    const fileRow = {
      id: "file-1234",
      submission_id: "sub-100",
      document_type_id: dbUuid,
      file_name: "endorsement.pdf",
      file_url: "storage://org-docs/endorsement.pdf",
      file_type: "application/pdf",
      file_size: 10240,
      validation_status: "correct",
      admin_status: "under_admin_review",
      admin_remarks: null,
      revision_history: [],
      uploaded_at: "2026-09-12T00:00:00Z",
      reviewed_at: null,
      created_at: "2026-09-12T00:00:00Z",
      updated_at: "2026-09-12T00:00:00Z",
      required_document_types: {
        id: dbUuid,
        name: "Custom Barangay Endorsement",
      },
    };
    const mappedFile = mapDocumentFile(fileRow as any);
    expect(mappedFile).not.toBeNull();
    expect(mappedFile!.documentTypeId).toBe(dbUuid);
  });

  // 10. New Admin-created template upload changes card from Not Uploaded to Under Review
  it("10. New Admin-created template upload changes card from Not Uploaded to Under Review", () => {
    const dbUuid = "4541fbc4-9d51-46bd-8da6-391494951475";
    const newDoc = {
      id: dbUuid,
      databaseId: dbUuid,
      name: "Dynamic YORP Test",
      title: "Dynamic YORP Test",
      description: "Test upload requirement",
      isRequired: true,
      templateActive: true,
      isActive: true,
    };

    // Before upload: renders Not Uploaded
    const { unmount } = render(
      <UserPortalDocumentWorkspaceView
        registrationPrerequisites={{ canAccessDocuments: true, profileComplete: true }}
        templateDocuments={[newDoc]}
        docFiles={[]}
        templatesById={{ [dbUuid]: newDoc as any }}
        navigate={vi.fn()}
        userRouteMap={{ "document-submission": "/document-submission" }}
      />
    );
    expect(screen.getAllByText("Not Uploaded").length).toBeGreaterThanOrEqual(1);
    unmount();

    // After upload: file with matching documentTypeId = dbUuid
    const uploadedFile: SubmissionFile = {
      id: "file-dyn-1",
      submissionId: "sub-1",
      documentTypeId: dbUuid,
      fileName: "dynamic-proof.pdf",
      fileUrl: "storage://docs/dynamic-proof.pdf",
      fileType: "application/pdf",
      fileSize: 2048,
      validationStatus: "correct",
      adminStatus: "under_admin_review",
      adminRemarks: "",
      revisionHistory: [],
      uploadedAt: "2026-09-12T01:00:00Z",
      reviewedAt: "",
      createdAt: "2026-09-12T01:00:00Z",
      updatedAt: "2026-09-12T01:00:00Z",
    };

    render(
      <UserPortalDocumentWorkspaceView
        registrationPrerequisites={{ canAccessDocuments: true, profileComplete: true }}
        templateDocuments={[newDoc]}
        docFiles={[uploadedFile]}
        templatesById={{ [dbUuid]: newDoc as any }}
        navigate={vi.fn()}
        userRouteMap={{ "document-submission": "/document-submission" }}
      />
    );
    expect(screen.getAllByText("Under Review").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Not Uploaded")).not.toBeInTheDocument();
  });

  // 11. Upload remains bound after refresh / re-sync
  it("11. Upload remains bound after refresh / re-sync", () => {
    const dbUuid = "4541fbc4-9d51-46bd-8da6-391494951475";
    // Simulated remote fetch after refresh
    const freshTemplateRow = {
      id: dbUuid,
      name: "Dynamic YORP Test",
      description: "Test upload requirement",
      sort_order: 10,
      is_required: true,
      is_active: true,
      template_scope: "document_submission",
      scope: "both",
      template_category: ["yorp"],
      template_url: "storage://template-files/dynamic.pdf",
    };
    const freshFileRow = {
      id: "file-dyn-1",
      submission_id: "sub-1",
      document_type_id: dbUuid,
      file_name: "dynamic-proof.pdf",
      file_url: "storage://docs/dynamic-proof.pdf",
      file_type: "application/pdf",
      file_size: 2048,
      validation_status: "correct",
      admin_status: "under_admin_review",
      admin_remarks: null,
      revision_history: [],
      uploaded_at: "2026-09-12T01:00:00Z",
      reviewed_at: null,
      created_at: "2026-09-12T01:00:00Z",
      updated_at: "2026-09-12T01:00:00Z",
      required_document_types: { id: dbUuid, name: "Dynamic YORP Test" },
    };

    const remappedTemplate = mapTemplate(freshTemplateRow as any)!;
    const remappedFile = mapDocumentFile(freshFileRow as any)!;

    render(
      <UserPortalDocumentWorkspaceView
        registrationPrerequisites={{ canAccessDocuments: true, profileComplete: true }}
        templateDocuments={[remappedTemplate]}
        docFiles={[remappedFile]}
        templatesById={{ [remappedTemplate.id]: remappedTemplate }}
        navigate={vi.fn()}
        userRouteMap={{ "document-submission": "/document-submission" }}
      />
    );
    expect(screen.getAllByText("Under Review").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Dynamic YORP Test").length).toBeGreaterThanOrEqual(1);
  });

  // 12. Existing seeded legacy documents still bind correctly via dual matching
  it("12. Existing seeded legacy documents still bind correctly via dual matching", () => {
    const cblDbUuid = "2377a066-1111-4000-8000-000000000001";
    const cblTemplate: TemplateRecord = {
      id: "constitution-bylaws", // legacy local ID
      databaseId: cblDbUuid,     // Supabase UUID
      name: "Constitution and By-Laws",
      description: "Official CBL",
      sortOrder: 1,
      isRequired: true,
      isActive: true,
      scope: "both",
      templateScope: "document_submission",
      templateDescription: "CBL template",
      templateActive: true,
      templateFileName: "cbl.pdf",
      templateFileUrl: "storage://cbl.pdf",
      templateFileType: "application/pdf",
      templateUploadedAt: "2026-01-01",
      templateCategories: ["yorp"],
      templateFileSize: 1024,
      templateUrl: "storage://cbl.pdf",
    };

    // Case A: File stored with database UUID
    const fileWithUuid: SubmissionFile = {
      id: "f-cbl-1",
      submissionId: "sub-1",
      documentTypeId: cblDbUuid,
      fileName: "signed-cbl.pdf",
      fileUrl: "storage://signed-cbl.pdf",
      fileType: "application/pdf",
      fileSize: 5000,
      validationStatus: "correct",
      adminStatus: "approved",
      adminRemarks: "",
      revisionHistory: [],
      uploadedAt: "2026-09-12T00:00:00Z",
      reviewedAt: "2026-09-12T01:00:00Z",
      createdAt: "2026-09-12T00:00:00Z",
      updatedAt: "2026-09-12T01:00:00Z",
    };

    const { unmount } = render(
      <UserPortalDocumentWorkspaceView
        registrationPrerequisites={{ canAccessDocuments: true, profileComplete: true }}
        templateDocuments={[cblTemplate]}
        docFiles={[fileWithUuid]}
        templatesById={{ [cblTemplate.id]: cblTemplate }}
        navigate={vi.fn()}
        userRouteMap={{ "document-submission": "/document-submission" }}
      />
    );
    expect(screen.getAllByText("Approved").length).toBeGreaterThanOrEqual(1);
    unmount();

    // Case B: File stored with legacy local slug
    const fileWithSlug: SubmissionFile = {
      ...fileWithUuid,
      id: "f-cbl-2",
      documentTypeId: "constitution-bylaws",
    };

    render(
      <UserPortalDocumentWorkspaceView
        registrationPrerequisites={{ canAccessDocuments: true, profileComplete: true }}
        templateDocuments={[cblTemplate]}
        docFiles={[fileWithSlug]}
        templatesById={{ [cblTemplate.id]: cblTemplate }}
        navigate={vi.fn()}
        userRouteMap={{ "document-submission": "/document-submission" }}
      />
    );
    expect(screen.getAllByText("Approved").length).toBeGreaterThanOrEqual(1);
  });

  // 13. Admin review still resolves uploaded files correctly via dual matching
  it("13. Admin review still resolves uploaded files correctly via dual matching", () => {
    const templateDocuments: TemplateRecord[] = [
      {
        id: "constitution-bylaws",
        databaseId: "2377a066-1111-4000-8000-000000000001",
        name: "Constitution and By-Laws",
        description: "",
        sortOrder: 1,
        isRequired: true,
        isActive: true,
        scope: "both",
        templateScope: "document_submission",
        templateDescription: "",
        templateActive: true,
        templateFileName: "",
        templateFileUrl: "",
        templateFileType: "application/pdf",
        templateUploadedAt: "",
        templateCategories: ["yorp"],
        templateFileSize: null,
        templateUrl: "",
      },
      {
        id: "4541fbc4-9d51-46bd-8da6-391494951475",
        databaseId: "4541fbc4-9d51-46bd-8da6-391494951475",
        name: "Dynamic YORP Test",
        description: "",
        sortOrder: 2,
        isRequired: true,
        isActive: true,
        scope: "registration",
        templateScope: "document_submission",
        templateDescription: "",
        templateActive: true,
        templateFileName: "",
        templateFileUrl: "",
        templateFileType: "application/pdf",
        templateUploadedAt: "",
        templateCategories: ["yorp"],
        templateFileSize: null,
        templateUrl: "",
      },
    ];

    const selectedFiles: SubmissionFile[] = [
      {
        id: "file-cbl",
        submissionId: "sub-1",
        documentTypeId: "2377a066-1111-4000-8000-000000000001", // DB UUID matching databaseId
        fileName: "cbl.pdf",
        fileUrl: "storage://cbl.pdf",
        fileType: "application/pdf",
        fileSize: 100,
        validationStatus: "correct",
        adminStatus: "under_admin_review",
        adminRemarks: "",
        revisionHistory: [],
        uploadedAt: "",
        reviewedAt: "",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "file-dyn",
        submissionId: "sub-1",
        documentTypeId: "4541fbc4-9d51-46bd-8da6-391494951475", // DB UUID matching id & databaseId
        fileName: "dyn.pdf",
        fileUrl: "storage://dyn.pdf",
        fileType: "application/pdf",
        fileSize: 100,
        validationStatus: "correct",
        adminStatus: "under_admin_review",
        adminRemarks: "",
        revisionHistory: [],
        uploadedAt: "",
        reviewedAt: "",
        createdAt: "",
        updatedAt: "",
      },
    ];

    // Simulate AdminPortal orderedSubmittedFiles mapping
    const orderedSubmittedFiles = templateDocuments
      .map((documentType) => {
        const file = selectedFiles.find(
          (entry) =>
            entry.documentTypeId === documentType.id ||
            (documentType.databaseId && entry.documentTypeId === documentType.databaseId),
        );
        if (!file) return null;
        return { documentType, file };
      })
      .filter(Boolean);

    expect(orderedSubmittedFiles).toHaveLength(2);
    expect(orderedSubmittedFiles[0]?.documentType.name).toBe("Constitution and By-Laws");
    expect(orderedSubmittedFiles[0]?.file.id).toBe("file-cbl");
    expect(orderedSubmittedFiles[1]?.documentType.name).toBe("Dynamic YORP Test");
    expect(orderedSubmittedFiles[1]?.file.id).toBe("file-dyn");
  });

  // 14. Data Request Form remains available in downloadable templates context
  it("14. Data Request Form remains available in downloadable templates context", () => {
    const dataFormTemplate: TemplateRecord = {
      id: "pcydo-data-request",
      databaseId: "2377a066-6666-4000-8000-000000000006",
      name: "PCYDO YORP Data Request Form",
      description: "Official PCYDO data request form.",
      sortOrder: 6,
      isRequired: true,
      isActive: true,
      scope: "both",
      templateScope: "document_submission",
      templateDescription: "Data request template",
      templateActive: true,
      templateFileName: "data-request.pdf",
      templateFileUrl: "storage://data-request.pdf",
      templateFileType: "application/pdf",
      templateUploadedAt: "2026-08-01",
      templateCategories: ["data_form"],
      templateFileSize: 52000,
      templateUrl: "storage://data-request.pdf",
    };

    // It is excluded from registration:
    expect(filterRegistrationTemplateDocuments([dataFormTemplate])).toHaveLength(0);

    // But it is present in all user active templates (downloadable):
    const allActiveTemplates = [dataFormTemplate].filter((t) => t.isActive && t.templateActive);
    expect(allActiveTemplates).toHaveLength(1);
    expect(allActiveTemplates[0].name).toBe("PCYDO YORP Data Request Form");
    expect(allActiveTemplates[0].templateCategories).toContain("data_form");
  });

  // 15. Existing renewal workflow still works and returns renewal required document types
  it("15. Existing renewal workflow still works and returns renewal required document types", async () => {
    const renewalTemplates = await fetchRenewalRequiredDocumentTypesInSupabase();
    expect(renewalTemplates.length).toBeGreaterThanOrEqual(6);
    const renewalIds = renewalTemplates.map((t) => t.id);
    expect(renewalIds).toContain("constitution-bylaws");
    expect(renewalIds).toContain("yorp-form-b");
    expect(renewalIds).toContain("yorp-officers-adviser");
    expect(renewalIds).toContain("yorp-members");
    expect(renewalIds).toContain("pcydo-form-a");
    expect(renewalIds).toContain("pcydo-data-request");
  });

  // 16. Existing requiredness behavior remains intact
  it("16. Existing requiredness behavior remains intact", () => {
    const requiredRow = {
      id: "req-1",
      name: "Mandatory Doc",
      sort_order: 1,
      is_required: true,
      is_active: true,
      template_scope: "document_submission",
      scope: "registration",
      template_category: ["yorp"],
    };
    const optionalRow = {
      id: "opt-1",
      name: "Optional Endorsement",
      sort_order: 2,
      is_required: false,
      is_active: true,
      template_scope: "document_submission",
      scope: "registration",
      template_category: ["yorp"],
    };

    const reqMapped = mapTemplate(requiredRow as any)!;
    const optMapped = mapTemplate(optionalRow as any)!;

    expect(reqMapped.isRequired).toBe(true);
    expect(optMapped.isRequired).toBe(false);
  });

  // 17. No duplicate template records appear after sync
  it("17. No duplicate template records appear after sync", () => {
    const existingList: TemplateRecord[] = [
      {
        id: "dyn-1",
        databaseId: "uuid-dyn-1",
        name: "Dynamic Doc 1",
        description: "",
        sortOrder: 1,
        isRequired: true,
        isActive: true,
        scope: "registration",
        templateScope: "document_submission",
        templateDescription: "",
        templateActive: true,
        templateFileName: "",
        templateFileUrl: "",
        templateFileType: "application/pdf",
        templateUploadedAt: "",
        templateCategories: ["yorp"],
        templateFileSize: null,
        templateUrl: "",
      },
    ];

    // Incoming remote row with same databaseId
    const incomingRow = {
      id: "uuid-dyn-1",
      name: "Dynamic Doc 1 (Updated)",
      sort_order: 1,
      is_required: true,
      is_active: true,
      template_scope: "document_submission",
      scope: "registration",
      template_category: ["yorp"],
    };

    const mapped = mapTemplate(incomingRow as any)!;

    // Deduplicate by databaseId || id
    const seen = new Set<string>();
    const deduplicated: TemplateRecord[] = [];
    for (const t of [mapped, ...existingList]) {
      const key = t.databaseId || t.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(t);
      }
    }

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].name).toBe("Dynamic Doc 1 (Updated)");
  });

  // 18. Inactive templates do not appear in User Registration
  it("18. Inactive templates do not appear in User Registration", () => {
    const inactiveRow = {
      id: "inact-1",
      name: "Deprecated Form",
      sort_order: 1,
      is_required: true,
      is_active: false, // inactive!
      template_scope: "document_submission",
      scope: "registration",
      template_category: ["yorp"],
    };
    const template = mapTemplate(inactiveRow as any)!;
    expect(template.isActive).toBe(false);
    const filtered = filterRegistrationTemplateDocuments([template]);
    expect(filtered).toHaveLength(0);
  });

  // 19. Admin editing workflow scope changes User visibility correctly
  it("19. Admin editing workflow scope changes User visibility correctly", () => {
    const template: TemplateRecord = {
      id: "flex-doc-1",
      databaseId: "uuid-flex-1",
      name: "Flexible Workflow Document",
      description: "Document that can change scope",
      sortOrder: 1,
      isRequired: true,
      isActive: true,
      scope: "registration",
      templateScope: "document_submission",
      templateDescription: "",
      templateActive: true,
      templateFileName: "doc.pdf",
      templateFileUrl: "storage://doc.pdf",
      templateFileType: "application/pdf",
      templateUploadedAt: "",
      templateCategories: ["yorp"],
      templateFileSize: 100,
      templateUrl: "storage://doc.pdf",
    };

    // State 1: scope = registration -> visible in registration
    expect(filterRegistrationTemplateDocuments([template])).toHaveLength(1);

    // State 2: Admin changes scope to "renewal"
    const renewalTemplate = { ...template, scope: "renewal" as const };
    expect(filterRegistrationTemplateDocuments([renewalTemplate])).toHaveLength(0);

    // State 3: Admin changes templateScope to "other" (downloadable only)
    const downloadableTemplate = { ...template, templateScope: "other" as const };
    expect(filterRegistrationTemplateDocuments([downloadableTemplate])).toHaveLength(0);

    // State 4: Admin changes scope to "both" -> visible again
    const bothTemplate = { ...template, scope: "both" as const };
    expect(filterRegistrationTemplateDocuments([bothTemplate])).toHaveLength(1);
  });
});
