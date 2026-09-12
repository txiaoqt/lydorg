import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplatesTable } from "./TemplatesTable";
import type { TemplateRecord } from "@/lib/lydo-connect-data";

describe("TemplatesTable safe category rendering", () => {
  const dummyTemplate: TemplateRecord = {
    id: "test-doc-1",
    databaseId: "db-1",
    name: "YORP Directory of Officers",
    description: "Directory form for officers",
    templateDescription: "Directory form for officers",
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

  const defaultProps = {
    templates: [dummyTemplate],
    categoryOptions: ["yorp", "ypop", "move", "data_form"],
    searchValue: "",
    onSearchChange: vi.fn(),
    statusFilter: "all" as const,
    onStatusFilterChange: vi.fn(),
    categoryFilter: "all",
    onCategoryFilterChange: vi.fn(),
    onPreview: vi.fn(),
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onRestore: vi.fn(),
    onDelete: vi.fn(),
  };

  it("renders correctly with normal templateCategories", () => {
    render(<TemplatesTable {...defaultProps} />);
    expect(screen.getByText("YORP Directory of Officers")).toBeDefined();
    expect(screen.getAllByText("YORP").length).toBeGreaterThanOrEqual(1);
  });

  it("renders without crashing when templateCategories is undefined", () => {
    const brokenTemplate = {
      ...dummyTemplate,
      id: "broken-1",
      name: "MOVE Application Form",
      templateCategories: undefined as any,
    };

    expect(() => {
      render(<TemplatesTable {...defaultProps} templates={[brokenTemplate]} />);
    }).not.toThrow();

    expect(screen.getByText("MOVE Application Form")).toBeDefined();
    expect(screen.getAllByText("MOVE").length).toBeGreaterThanOrEqual(1);
  });

  it("renders without crashing when templateCategories is empty array", () => {
    const emptyCategoryTemplate = {
      ...dummyTemplate,
      id: "empty-1",
      name: "General Data Request Form",
      templateCategories: [],
    };

    expect(() => {
      render(<TemplatesTable {...defaultProps} templates={[emptyCategoryTemplate]} />);
    }).not.toThrow();

    expect(screen.getByText("General Data Request Form")).toBeDefined();
    expect(screen.getAllByText("Data Form").length).toBeGreaterThanOrEqual(1);
  });

  it("filters correctly when categoryFilter is set", () => {
    const templateYorp = { ...dummyTemplate, id: "yorp-1", name: "YORP Form" };
    const templateMove = {
      ...dummyTemplate,
      id: "move-1",
      name: "MOVE Form",
      templateCategories: ["move"],
    };

    render(
      <TemplatesTable
        {...defaultProps}
        templates={[templateYorp, templateMove]}
        categoryFilter="move"
      />,
    );

    expect(screen.getByText("MOVE Form")).toBeDefined();
  });
});
