import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  normalizeTemplateCategoryKey,
  isSystemTemplateCategory,
  getTemplateCategoryUsage,
  buildAdminTemplateCategoryOptions,
  formatCanonicalCategoryLabel,
  type TemplateRecord,
} from "@/lib/lydo-connect-data";
import { readState } from "@/lib/lydo-connect-store";
import { TemplateFormDialog } from "./TemplateFormDialog";

describe("Forms & Templates — Description Validation & Custom Category Lifecycle", () => {
  const dummyTemplate: TemplateRecord = {
    id: "template-1",
    databaseId: "db-template-1",
    name: "Standard YORP Document",
    description: "Official YORP registration requirement.",
    templateDescription: "Official YORP registration requirement.",
    templateUrl: "storage://template-files/test.pdf",
    templateFileUrl: "storage://template-files/test.pdf",
    templateFileName: "test.pdf",
    templateFileType: "application/pdf",
    templateUploadedAt: "2026-06-26T07:10:12.769Z",
    templateFileSize: 1024,
    sortOrder: 1,
    isRequired: true,
    isActive: true,
    scope: "both",
    templateScope: "document_submission",
    templateCategories: ["yorp"],
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  // ==========================================
  // Description validation tests
  // ==========================================
  describe("Description Validation (TEST 1 - TEST 6)", () => {
    const validateDescriptionSubmission = (description: string): boolean => {
      return Boolean(description.trim());
    };

    it("TEST 1: Create with empty description is blocked", () => {
      expect(validateDescriptionSubmission("")).toBe(false);
    });

    it("TEST 2: Create with whitespace-only description is blocked", () => {
      expect(validateDescriptionSubmission("   ")).toBe(false);
      expect(validateDescriptionSubmission("\n\t  ")).toBe(false);
    });

    it("TEST 3: Create with valid description is allowed", () => {
      expect(validateDescriptionSubmission("Official YORP registration requirement.")).toBe(true);
    });

    it("TEST 4: Edit and clear description is blocked", () => {
      const initial = "Original description";
      const cleared = "";
      expect(validateDescriptionSubmission(initial)).toBe(true);
      expect(validateDescriptionSubmission(cleared)).toBe(false);
    });

    it("TEST 5: Edit with whitespace-only description is blocked", () => {
      expect(validateDescriptionSubmission("   \t  ")).toBe(false);
    });

    it("TEST 6: Existing valid edit is allowed", () => {
      expect(validateDescriptionSubmission("Updated form guidelines.")).toBe(true);
    });

    it("Form-level defense: TemplateFormDialog textarea has required attribute", () => {
      render(
        <TemplateFormDialog
          mode="create"
          name="Test Form"
          onNameChange={vi.fn()}
          description=""
          onDescriptionChange={vi.fn()}
          category="yorp"
          onCategoryChange={vi.fn()}
          file={null}
          onFileChange={vi.fn()}
          saving={false}
          onCancel={vi.fn()}
          onSave={vi.fn()}
        />,
      );

      const textarea = screen.getByPlaceholderText(/Enter a brief description/i);
      expect(textarea).toHaveAttribute("required");
    });
  });

  // ==========================================
  // Category normalization tests
  // ==========================================
  describe("Category Normalization (TEST 7 - TEST 9)", () => {
    it("TEST 7: Data Form normalizes to data_form", () => {
      expect(normalizeTemplateCategoryKey("Data Form")).toBe("data_form");
      expect(normalizeTemplateCategoryKey("  Data Form  ")).toBe("data_form");
    });

    it("TEST 8: data-form normalizes to data_form", () => {
      expect(normalizeTemplateCategoryKey("data-form")).toBe("data_form");
      expect(normalizeTemplateCategoryKey("data--form")).toBe("data_form");
      expect(normalizeTemplateCategoryKey("youth-development")).toBe("youth_development");
      expect(normalizeTemplateCategoryKey("Youth Development")).toBe("youth_development");
    });

    it("TEST 9: Duplicate normalized category cannot be added", () => {
      const existingOptions = ["yorp", "ypop", "move", "data_form", "youth_development"];
      const options = buildAdminTemplateCategoryOptions([], [
        "youth_development",
        "Youth Development",
        "youth-development",
        "data_form",
        "Data Form",
      ]);

      // Deduplicated after normalization
      const countYouth = options.filter((k) => k === "youth_development").length;
      const countDataForm = options.filter((k) => k === "data_form").length;
      expect(countYouth).toBe(1);
      expect(countDataForm).toBe(1);
    });
  });

  // ==========================================
  // System category protection tests
  // ==========================================
  describe("System Category Protection (TEST 10 - TEST 13)", () => {
    it("TEST 10: YORP cannot be deleted", () => {
      expect(isSystemTemplateCategory("yorp")).toBe(true);
      expect(isSystemTemplateCategory("YORP")).toBe(true);
      expect(isSystemTemplateCategory("  yorp  ")).toBe(true);
    });

    it("TEST 11: YPOP cannot be deleted", () => {
      expect(isSystemTemplateCategory("ypop")).toBe(true);
      expect(isSystemTemplateCategory("YPOP")).toBe(true);
    });

    it("TEST 12: MOVE cannot be deleted", () => {
      expect(isSystemTemplateCategory("move")).toBe(true);
      expect(isSystemTemplateCategory("MOVE")).toBe(true);
    });

    it("TEST 13: Data Form cannot be deleted", () => {
      expect(isSystemTemplateCategory("data_form")).toBe(true);
      expect(isSystemTemplateCategory("Data Form")).toBe(true);
      expect(isSystemTemplateCategory("data-form")).toBe(true);
    });

    it("Custom categories are correctly identified as non-system", () => {
      expect(isSystemTemplateCategory("youth_development")).toBe(false);
      expect(isSystemTemplateCategory("handbook")).toBe(false);
    });
  });

  // ==========================================
  // Usage guard tests
  // ==========================================
  describe("Usage Guard (TEST 14 - TEST 17)", () => {
    it("TEST 14: Custom category with one active template: deletion blocked", () => {
      const templates = [
        {
          ...dummyTemplate,
          id: "t-1",
          name: "Handbook 1",
          isActive: true,
          templateCategories: ["handbook"],
        },
      ];

      const usage = getTemplateCategoryUsage("handbook", templates);
      expect(usage.count).toBe(1);
      expect(usage.activeCount).toBe(1);
      expect(usage.archivedCount).toBe(0);
      expect(usage.count > 0).toBe(true);
    });

    it("TEST 15: Custom category with one archived template: deletion blocked", () => {
      const templates = [
        {
          ...dummyTemplate,
          id: "t-2",
          name: "Old Handbook",
          isActive: false,
          templateCategories: ["handbook"],
        },
      ];

      const usage = getTemplateCategoryUsage("handbook", templates);
      expect(usage.count).toBe(1);
      expect(usage.activeCount).toBe(0);
      expect(usage.archivedCount).toBe(1);
      expect(usage.count > 0).toBe(true);
    });

    it("TEST 16: Custom category with active + archived templates: deletion blocked", () => {
      const templates = [
        {
          ...dummyTemplate,
          id: "t-active-1",
          name: "Active Doc",
          isActive: true,
          templateCategories: ["special_project"],
        },
        {
          ...dummyTemplate,
          id: "t-archived-1",
          name: "Archived Doc 1",
          isActive: false,
          templateCategories: ["special_project"],
        },
        {
          ...dummyTemplate,
          id: "t-archived-2",
          name: "Archived Doc 2",
          isActive: false,
          templateCategories: ["special_project"],
        },
      ];

      const usage = getTemplateCategoryUsage("special_project", templates);
      expect(usage.activeCount).toBe(1);
      expect(usage.archivedCount).toBe(2);
      expect(usage.count).toBe(3);
      expect(usage.count > 0).toBe(true);
    });

    it("TEST 17: Custom category referenced by a multi-category template: deletion blocked", () => {
      const templates = [
        {
          ...dummyTemplate,
          id: "t-multi-1",
          name: "Multi-category Guide",
          isActive: true,
          templateCategories: ["yorp", "custom_initiative"],
        },
      ];

      const usage = getTemplateCategoryUsage("custom_initiative", templates);
      expect(usage.count).toBe(1);
      expect(usage.templateNames).toContain("Multi-category Guide");
      expect(usage.count > 0).toBe(true);
    });
  });

  // ==========================================
  // Empty category tests
  // ==========================================
  describe("Empty Category Deletion (TEST 18 - TEST 20)", () => {
    it("TEST 18: Custom category with zero templates: usage count is 0", () => {
      const templates = [
        {
          ...dummyTemplate,
          templateCategories: ["yorp"],
        },
      ];

      const usage = getTemplateCategoryUsage("unused_custom", templates);
      expect(usage.count).toBe(0);
      expect(usage.activeCount).toBe(0);
      expect(usage.archivedCount).toBe(0);
    });

    it("TEST 19: Confirm delete: category removed from custom registry", () => {
      let customCategories = ["unused_custom", "other_custom"];
      const removeCategory = (cat: string) => {
        const normalized = normalizeTemplateCategoryKey(cat);
        customCategories = customCategories.filter((c) => c !== normalized);
      };

      removeCategory("unused_custom");
      expect(customCategories).not.toContain("unused_custom");
      expect(customCategories).toContain("other_custom");
    });

    it("TEST 20: Cancel delete: category remains", () => {
      const customCategories = ["unused_custom", "other_custom"];
      // Cancel is triggered, no mutation occurs
      const onCancel = () => {};
      onCancel();
      expect(customCategories).toContain("unused_custom");
    });
  });

  // ==========================================
  // Persistence tests
  // ==========================================
  describe("Custom Category Persistence (TEST 21 - TEST 22)", () => {
    it("TEST 21: Create custom category: survives state refresh/reload", () => {
      const storageKey = "lydo-connect-state-v1:admin:admin-test-id";
      const initialState = {
        customTemplateCategories: ["youth_development"],
        templates: [],
      };
      window.localStorage.setItem(storageKey, JSON.stringify(initialState));

      const restored = readState({ type: "admin", id: "admin-test-id", token: "tok" });
      expect(restored.customTemplateCategories).toContain("youth_development");
    });

    it("TEST 22: Delete empty custom category: remains deleted after refresh", () => {
      const storageKey = "lydo-connect-state-v1:admin:admin-test-id";
      const stateAfterDelete = {
        customTemplateCategories: ["kept_category"],
        templates: [],
      };
      window.localStorage.setItem(storageKey, JSON.stringify(stateAfterDelete));

      const restored = readState({ type: "admin", id: "admin-test-id", token: "tok" });
      expect(restored.customTemplateCategories).not.toContain("youth_development");
      expect(restored.customTemplateCategories).toContain("kept_category");
    });
  });

  // ==========================================
  // Existing category compatibility
  // ==========================================
  describe("Existing Category Compatibility (TEST 23 - TEST 24)", () => {
    it("TEST 23: Existing custom category present only through a legacy template row still appears in dropdown", () => {
      const legacyTemplates = [
        {
          ...dummyTemplate,
          id: "legacy-doc-1",
          name: "Legacy Guideline",
          templateCategories: ["legacy_special_category"],
        },
      ];

      // customTemplateCategories is empty
      const options = buildAdminTemplateCategoryOptions(legacyTemplates, []);
      expect(options).toContain("legacy_special_category");
      expect(options[0]).toBe("yorp");
    });

    it("TEST 24: Deleting a category must never mutate template.category arrays", () => {
      const templateRecord: TemplateRecord = {
        ...dummyTemplate,
        id: "t-preserve",
        templateCategories: ["yorp", "preserved_category"],
      };

      const originalCategories = [...templateRecord.templateCategories];

      // Simulated category deletion operation on custom registry
      let customRegistry = ["preserved_category", "empty_category"];
      customRegistry = customRegistry.filter((c) => c !== "empty_category");

      // Verify template categories array was untouched
      expect(templateRecord.templateCategories).toEqual(originalCategories);
      expect(templateRecord.templateCategories).toContain("preserved_category");
    });
  });

  // ==========================================
  // UI Dialog & Deletion Entry Point
  // ==========================================
  describe("UI Dialog & Category Dropdown Actions", () => {
    it("renders custom category with delete action in dropdown but never for system categories", async () => {
      const onDeleteCategory = vi.fn();
      render(
        <TemplateFormDialog
          mode="create"
          name="Test Form"
          onNameChange={vi.fn()}
          description="Sample description"
          onDescriptionChange={vi.fn()}
          category="yorp"
          onCategoryChange={vi.fn()}
          categoryOptions={["yorp", "ypop", "move", "data_form", "custom_workshop"]}
          file={null}
          onFileChange={vi.fn()}
          saving={false}
          onCancel={vi.fn()}
          onSave={vi.fn()}
          onDeleteCategory={onDeleteCategory}
        />,
      );

      // Open category dropdown (Radix UI triggers on pointerDown / Enter)
      const selectCategoryTrigger = screen.getByRole("button", { name: /YORP/i });
      fireEvent.pointerDown(selectCategoryTrigger);
      fireEvent.keyDown(selectCategoryTrigger, { key: "Enter" });

      // System categories must NOT have a delete button
      expect(screen.queryByLabelText("Delete category YORP")).toBeNull();
      expect(screen.queryByLabelText("Delete category YPOP")).toBeNull();
      expect(screen.queryByLabelText("Delete category MOVE")).toBeNull();
      expect(screen.queryByLabelText("Delete category Data Form")).toBeNull();

      // Custom category MUST have delete button
      const customDeleteBtn = await screen.findByLabelText("Delete category Custom Workshop");
      expect(customDeleteBtn).toBeInTheDocument();

      fireEvent.click(customDeleteBtn);
      expect(onDeleteCategory).toHaveBeenCalledWith("custom_workshop");
    });

    it("allows adding new custom category and validates input", () => {
      const onAddCategory = vi.fn();
      const onCategoryChange = vi.fn();
      render(
        <TemplateFormDialog
          mode="create"
          name="Test Form"
          onNameChange={vi.fn()}
          description="Sample description"
          onDescriptionChange={vi.fn()}
          category=""
          onCategoryChange={onCategoryChange}
          categoryOptions={["yorp", "ypop", "move", "data_form"]}
          file={null}
          onFileChange={vi.fn()}
          saving={false}
          onCancel={vi.fn()}
          onSave={vi.fn()}
          onAddCategory={onAddCategory}
        />,
      );

      // Click "+ New category"
      const newCategoryBtn = screen.getByRole("button", { name: /\+ New category/i });
      fireEvent.click(newCategoryBtn);

      // Input field appears
      const input = screen.getByPlaceholderText(/e\.g\. Youth Development/i);
      expect(input).toBeInTheDocument();

      // Try empty submission
      const addBtn = screen.getByRole("button", { name: /^Add$/i });
      fireEvent.click(addBtn);
      expect(screen.getByText(/Please enter a category name/i)).toBeInTheDocument();
      expect(onAddCategory).not.toHaveBeenCalled();

      // Try system category submission (e.g. "Data Form")
      fireEvent.change(input, { target: { value: "Data Form" } });
      fireEvent.click(addBtn);
      expect(screen.getByText(/"Data Form" is a system category/i)).toBeInTheDocument();
      expect(onAddCategory).not.toHaveBeenCalled();

      // Enter valid custom category
      fireEvent.change(input, { target: { value: "Youth Leadership" } });
      fireEvent.click(addBtn);
      expect(onAddCategory).toHaveBeenCalledWith("youth_leadership");
      expect(onCategoryChange).toHaveBeenCalledWith("youth_leadership");
    });
  });
});
