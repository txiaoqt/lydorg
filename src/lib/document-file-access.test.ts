import { describe, expect, it } from "vitest";
import { resolveRegistrationDocumentAccess } from "./document-file-access";

describe("registration document file access", () => {
  it("keeps approved files viewable while locking changes", () => {
    const access = resolveRegistrationDocumentAccess({
      file: { adminStatus: "approved_green", fileUrl: "organization/file.pdf" },
      submissionApproved: true,
    });
    expect(access.canViewAttachedFile).toBe(true);
    expect(access.canReplaceOrRemove).toBe(false);
  });

  it("allows correction files to be viewed and replaced", () => {
    const access = resolveRegistrationDocumentAccess({
      file: { adminStatus: "needs_revision", fileUrl: "organization/file.pdf" },
    });
    expect(access.canViewAttachedFile).toBe(true);
    expect(access.canReplaceOrRemove).toBe(true);
  });

  it("does not offer viewing when no attached reference exists", () => {
    expect(resolveRegistrationDocumentAccess({
      file: { adminStatus: "approved_green", fileUrl: "" },
    }).canViewAttachedFile).toBe(false);
  });
});
