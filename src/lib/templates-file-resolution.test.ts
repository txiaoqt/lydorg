import { describe, it, expect } from "vitest";
import { requiredDocumentTypes, otherDocumentTypes, seedState } from "./lydo-connect-data";
import { getDocumentSchemaForSlot } from "./ocr/documentSchemas";
import JSZip from "jszip";

describe("Forms & Templates: 6+2 Separation and Seed Integrity", () => {
  it("maintains exactly 6 required document submission types", () => {
    expect(requiredDocumentTypes).toHaveLength(6);
    requiredDocumentTypes.forEach((doc, idx) => {
      expect(doc.templateScope).toBe("document_submission");
      expect(doc.sortOrder).toBe(idx + 1);
      expect(doc.templateUrl).toMatch(/^storage:\/\/template-files\//);
    });
  });

  it("maintains exactly 2 other reference document types", () => {
    expect(otherDocumentTypes).toHaveLength(2);
    expect(otherDocumentTypes[0].name).toBe("MOVE Guidelines");
    expect(otherDocumentTypes[0].templateScope).toBe("other");
    expect(otherDocumentTypes[0].templateUrl).toMatch(/^storage:\/\/template-files\//);

    expect(otherDocumentTypes[1].name).toBe("MOVE Registration Form");
    expect(otherDocumentTypes[1].templateScope).toBe("other");
    expect(otherDocumentTypes[1].templateUrl).toMatch(/^storage:\/\/template-files\//);
  });

  it("seedState contains exactly 8 templates with valid storage URIs", () => {
    expect(seedState.templates).toHaveLength(8);

    const docSubmissions = seedState.templates.filter((t) => t.templateScope === "document_submission");
    const otherTemplates = seedState.templates.filter((t) => t.templateScope === "other");

    expect(docSubmissions).toHaveLength(6);
    expect(otherTemplates).toHaveLength(2);

    seedState.templates.forEach((t) => {
      expect(t.templateActive).toBe(true);
      expect(t.isActive).toBe(true);
      expect(t.templateFileUrl).toMatch(/^storage:\/\/template-files\//);
      expect(t.templateFileUrl.startsWith("#")).toBe(false);
      expect(t.templateFileName).toBeTruthy();
    });
  });

  it("matches OCR schemas for all required document names with or without year prefix", () => {
    const requiredNames = [
      "Constitution and By-Laws",
      "NYC YORP Registration Form (Form B)",
      "2026 NYC YORP Registration Form (Form B)",
      "YORP Directory of Officers and Adviser",
      "2026 YORP Directory of Officers and Adviser",
      "YORP List of Members in Good Standing",
      "2026 YORP List of Members in Good Standing",
      "Pasig City YORP Registration Form (Form A)",
      "PCYDO YORP Data Request Form",
    ];

    requiredNames.forEach((name) => {
      const schema = getDocumentSchemaForSlot(name);
      expect(schema).not.toBeNull();
    });
  });

  it("generates a valid non-empty ZIP archive for document submissions", async () => {
    const zip = new JSZip();
    const docTemplates = seedState.templates.filter((t) => t.templateScope === "document_submission");

    expect(docTemplates).toHaveLength(6);

    docTemplates.forEach((t) => {
      const dummyContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
      zip.file(t.templateFileName, dummyContent);
    });

    const archive = await zip.generateAsync({ type: "blob" });
    expect(archive.size).toBeGreaterThan(0);

    const loadedZip = await JSZip.loadAsync(archive);
    const files = Object.keys(loadedZip.files);
    expect(files).toHaveLength(6);
  });

  it("generates a valid non-empty ZIP archive for other reference templates", async () => {
    const zip = new JSZip();
    const otherTemplates = seedState.templates.filter((t) => t.templateScope === "other");

    expect(otherTemplates).toHaveLength(2);

    otherTemplates.forEach((t) => {
      const dummyContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      zip.file(t.templateFileName, dummyContent);
    });

    const archive = await zip.generateAsync({ type: "blob" });
    expect(archive.size).toBeGreaterThan(0);

    const loadedZip = await JSZip.loadAsync(archive);
    const files = Object.keys(loadedZip.files);
    expect(files).toHaveLength(2);
  });
});
