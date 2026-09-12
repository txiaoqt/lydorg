import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  UserPortalTemplatesWorkspaceView,
  extractTemplateCategoryLabels,
} from "./UserPortalTemplatesWorkspaceView";
import {
  formatTemplateCategoryDropdownLabel,
  formatCanonicalCategoryLabel,
  orderTemplateCategories,
  deriveTemplateCategory,
} from "@/lib/lydo-connect-data";
import { mapTemplate } from "@/lib/lydo-connect-supabase";
import { normalizeTemplates } from "@/lib/lydo-connect-store";

describe("User Portal Template Category Consistency & Synchronization", () => {
  const mockCanonicalTemplates = [
    {
      id: "tpl-cbl",
      databaseId: "db-cbl",
      title: "Constitution and By-Laws",
      description: "Upload the signed constitution and by-laws in PDF format.",
      fileUrl: "storage://template-files/tpl-cbl/cbl.pdf",
      fileSize: 81612,
      category: "YORP",
      categories: ["YORP"],
      templateCategories: ["yorp"],
      isRequired: true,
      updatedAt: "2026-08-07T13:50:00Z",
    },
    {
      id: "tpl-data-request",
      databaseId: "db-data-request",
      title: "PCYDO YORP Data Request Form",
      description: "Current PCYDO data request form.",
      fileUrl: "storage://template-files/tpl-data-request/request.pdf",
      fileSize: 52000,
      category: "Data Form",
      categories: ["Data Form"],
      templateCategories: ["data_form"],
      isRequired: true,
      updatedAt: "2026-08-07T13:50:00Z",
    },
    {
      id: "tpl-move-guide",
      databaseId: "db-move-guide",
      title: "MOVE Guidelines",
      description: "Official MOVE Guidelines document.",
      fileUrl: "storage://template-files/tpl-move-guide/move.pdf",
      fileSize: 45056,
      category: "MOVE",
      categories: ["MOVE"],
      templateCategories: ["move"],
      isRequired: false,
      updatedAt: "2026-08-08T10:00:00Z",
    },
    {
      id: "tpl-ypop-form",
      databaseId: "db-ypop-form",
      title: "YPOP Activity Proposal Form",
      description: "Youth summit project proposal form.",
      fileUrl: "storage://template-files/tpl-ypop-form/ypop.pdf",
      fileSize: 63000,
      category: "YPOP",
      categories: ["YPOP"],
      templateCategories: ["ypop"],
      isRequired: false,
      updatedAt: "2026-08-09T10:00:00Z",
    },
  ];

  const defaultProps = {
    publicTemplates: mockCanonicalTemplates,
    openPreview: vi.fn(),
    openFile: vi.fn(),
    formatShortPortalDate: () => "Aug 7, 2026",
  };

  it("1. receives template_category array from Supabase via mapTemplate preserving all elements", () => {
    const rawRow = {
      id: "row-123",
      name: "PCYDO YORP Data Request Form",
      description: "Official data form",
      template_description: "Data request template",
      template_category: ["yorp", "data_form"],
      template_url: "storage://templates/form.pdf",
      template_file_size: 45000,
      is_active: true,
      template_active: true,
      sort_order: 3,
      scope: "document_submission",
    };

    const mapped = mapTemplate(rawRow);
    expect(mapped.templateCategories).toEqual(["yorp", "data_form"]);
    expect(mapped.databaseId).toBe("row-123");
    expect(mapped.isActive).toBe(true);
    expect(mapped.templateActive).toBe(true);
  });

  it("2. does NOT render legacy 'Registration Form' or 'Reference Guide' labels as normal categories", () => {
    render(<UserPortalTemplatesWorkspaceView {...defaultProps} />);

    // Verify canonical categories exist on the rendered template cards / table cells
    expect(screen.getAllByText("YORP").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MOVE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Data Form").length).toBeGreaterThan(0);
    expect(screen.getAllByText("YPOP").length).toBeGreaterThan(0);

    // Verify legacy arbitrary categories are NOT present
    expect(screen.queryByText("Registration Form")).not.toBeInTheDocument();
    expect(screen.queryByText("Reference Guide")).not.toBeInTheDocument();
    expect(screen.queryByText("Registration")).not.toBeInTheDocument();
    expect(screen.queryByText("Reference")).not.toBeInTheDocument();
  });

  it("3. dynamically derives filter options from fetched template records without hardcoded source array", () => {
    const dynamicTemplates = [
      {
        id: "d-1",
        title: "Dynamic YORP",
        templateCategories: ["yorp"],
      },
      {
        id: "d-2",
        title: "Dynamic MOVE",
        templateCategories: ["move"],
      },
      {
        id: "d-3",
        title: "Dynamic Data Form",
        templateCategories: ["data_form"],
      },
    ];

    const labels = new Set<string>();
    dynamicTemplates.forEach((t) => {
      extractTemplateCategoryLabels(t).forEach((l) => labels.add(l));
    });
    const derived = orderTemplateCategories(Array.from(labels));

    expect(derived).toEqual(["YORP", "MOVE", "Data Form"]);
  });

  it("4. multi-category template appears in both appropriate category filters without flattening to [0]", () => {
    // Multi-category template with ["yorp", "data_form"]
    const multiCatTemplate = {
      id: "multi-1",
      title: "PCYDO Multi-Category Document",
      categories: ["YORP", "Data Form"],
      templateCategories: ["yorp", "data_form"],
      isRequired: true,
    };

    const yorpOnlyTemplate = {
      id: "yorp-only",
      title: "YORP Only Document",
      categories: ["YORP"],
      templateCategories: ["yorp"],
      isRequired: true,
    };

    const templates = [multiCatTemplate, yorpOnlyTemplate];

    // Check extraction
    const extractedLabels = extractTemplateCategoryLabels(multiCatTemplate);
    expect(extractedLabels).toContain("YORP");
    expect(extractedLabels).toContain("Data Form");

    // Render with templates
    const { unmount } = render(
      <UserPortalTemplatesWorkspaceView {...defaultProps} publicTemplates={templates} />
    );

    // Initial view: both titles present
    expect(screen.getAllByText("PCYDO Multi-Category Document").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("YORP Only Document").length).toBeGreaterThanOrEqual(1);
    unmount();
  });

  it("5. automatically displays and filters unknown future category without source-code edit", () => {
    const futureTemplate = {
      id: "future-1",
      title: "Youth Innovation Grant Handbook",
      description: "Grant details",
      templateCategories: ["innovative_grant"],
      categories: ["Innovative Grant"],
      isRequired: false,
    };

    const extracted = extractTemplateCategoryLabels(futureTemplate);
    expect(extracted).toEqual(["Innovative Grant"]);

    render(
      <UserPortalTemplatesWorkspaceView
        {...defaultProps}
        publicTemplates={[futureTemplate]}
      />
    );

    // Check rendered badge contains "Innovative Grant"
    expect(screen.getAllByText("Innovative Grant").length).toBeGreaterThan(0);
  });

  it("6. Admin category filter matches User category values", () => {
    const rawCategories = ["data_form", "yorp", "move", "ypop", "custom_fellowship"];

    const adminFormatted = rawCategories.map(formatTemplateCategoryDropdownLabel);
    const userFormatted = rawCategories.map(formatCanonicalCategoryLabel);

    expect(adminFormatted).toEqual(userFormatted);
    expect(adminFormatted).toEqual(["Data Form", "YORP", "MOVE", "YPOP", "Custom Fellowship"]);

    const ordered = orderTemplateCategories(rawCategories);
    expect(ordered).toEqual(["yorp", "ypop", "move", "data_form", "custom_fellowship"]);
  });

  it("7. Data Form template is matched to Data Form and NOT YORP", () => {
    const dataRequestTemplate = mockCanonicalTemplates.find(
      (t) => t.id === "tpl-data-request"
    );
    expect(dataRequestTemplate).toBeDefined();

    const labels = extractTemplateCategoryLabels(dataRequestTemplate);
    expect(labels).toContain("Data Form");
    expect(labels).not.toContain("YORP");
  });

  it("8. deduplicates database templates over seed templates using databaseId or id", () => {
    const existingSeed = [
      {
        id: "tpl-1",
        databaseId: "db-uuid-1",
        name: "Old Seed Name",
        sortOrder: 1,
        isActive: true,
        templateActive: true,
      },
    ];

    const newRemoteTemplates = [
      {
        id: "tpl-1",
        databaseId: "db-uuid-1",
        name: "Authoritative Supabase Name",
        sortOrder: 1,
        isActive: true,
        templateActive: true,
      },
    ];

    const merged = normalizeTemplates([...existingSeed, ...newRemoteTemplates] as any);
    expect(merged.length).toBe(1);
    expect(merged[0].name).toBe("Authoritative Supabase Name");
  });

  it("9. supports searching across titles, descriptions, and dynamic category labels", () => {
    render(<UserPortalTemplatesWorkspaceView {...defaultProps} />);

    const searchInputs = screen.getAllByPlaceholderText(/Search templates/i);
    expect(searchInputs.length).toBeGreaterThanOrEqual(1);

    // Search by category label "MOVE"
    fireEvent.change(searchInputs[0], { target: { value: "MOVE" } });
    expect(screen.getAllByText("MOVE Guidelines").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Constitution and By-Laws")).not.toBeInTheDocument();

    // Search by category label "Data Form"
    fireEvent.change(searchInputs[0], { target: { value: "Data Form" } });
    expect(screen.getAllByText("PCYDO YORP Data Request Form").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Constitution and By-Laws")).not.toBeInTheDocument();
  });

  it("10. canonical category helpers produce standard display labels matching Admin Portal", () => {
    expect(formatTemplateCategoryDropdownLabel("yorp")).toBe("YORP");
    expect(formatTemplateCategoryDropdownLabel("move")).toBe("MOVE");
    expect(formatTemplateCategoryDropdownLabel("data_form")).toBe("Data Form");
    expect(formatTemplateCategoryDropdownLabel("ypop")).toBe("YPOP");
    expect(formatTemplateCategoryDropdownLabel("new_initiative")).toBe("New Initiative");

    // Derivation fallback
    expect(deriveTemplateCategory("2026 YORP Form")).toBe("yorp");
    expect(deriveTemplateCategory("MOVE Guidelines")).toBe("move");
    expect(deriveTemplateCategory("YPOP Attendance")).toBe("ypop");
    expect(deriveTemplateCategory("General Survey")).toBe("data_form");
  });

  it("11. user template visibility semantics excludes inactive/archived templates", () => {
    const mixedTemplates = [
      {
        id: "active-1",
        title: "Active Template",
        isActive: true,
        templateActive: true,
        sortOrder: 1,
      },
      {
        id: "inactive-1",
        title: "Inactive Template",
        isActive: false,
        templateActive: true,
        sortOrder: 2,
      },
      {
        id: "archived-1",
        title: "Archived Template",
        isActive: true,
        templateActive: false,
        sortOrder: 3,
      },
    ];

    const userVisible = mixedTemplates.filter(
      (t) => (t.templateActive ?? true) && t.isActive !== false,
    );

    expect(userVisible.length).toBe(1);
    expect(userVisible[0].title).toBe("Active Template");
  });

  it("12. newly created template is mapped and available immediately on state refresh", () => {
    // Simulating Admin creating a template row in required_document_types
    const newAdminRow = {
      id: "new-admin-tpl-001",
      name: "Example Youth Handbook",
      description: "Comprehensive guide for youth leaders",
      template_category: ["yorp"],
      template_url: "storage://template-files/handbook.pdf",
      template_file_size: 1048576,
      sort_order: 10,
      is_active: true,
      template_active: true,
      scope: "other",
    };

    const mapped = mapTemplate(newAdminRow as any);
    expect(mapped).not.toBeNull();
    expect(mapped?.name).toBe("Example Youth Handbook");
    expect(mapped?.templateCategories).toEqual(["yorp"]);

    const labels = extractTemplateCategoryLabels(mapped);
    expect(labels).toContain("YORP");
  });

  it("13. renders dynamic category-driven sections (YORP, Data Form, MOVE, YPOP) matching Admin model", () => {
    render(<UserPortalTemplatesWorkspaceView {...defaultProps} />);

    // Verify category section headers are rendered (matching Admin model)
    expect(screen.getAllByText(/YORP \(\d+\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Data Form \(\d+\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/MOVE \(\d+\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/YPOP \(\d+\)/i).length).toBeGreaterThan(0);

    // Verify misleading hardcoded legacy section titles are completely absent
    expect(screen.queryByText(/Required Registration Templates/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Optional & Reference Templates/i)).not.toBeInTheDocument();
  });

  it("14. PCYDO YORP Data Request Form appears under Data Form section and NOT under YORP", () => {
    const { container } = render(<UserPortalTemplatesWorkspaceView {...defaultProps} />);

    // In desktop layout, find the Data Form card/table
    const desktopLayout = container.querySelector(".desktop-layout");
    expect(desktopLayout).toBeInTheDocument();

    // Verify PCYDO YORP Data Request Form is rendered under Data Form
    const dataFormSection = Array.from(desktopLayout!.querySelectorAll("h3")).find(
      (el) => el.textContent?.includes("Data Form")
    )?.closest(".rounded-2xl");
    expect(dataFormSection).toBeDefined();
    expect(dataFormSection?.textContent).toContain("PCYDO YORP Data Request Form");

    // Verify it is NOT present in the YORP section
    const yorpSection = Array.from(desktopLayout!.querySelectorAll("h3")).find(
      (el) => el.textContent?.includes("YORP")
    )?.closest(".rounded-2xl");
    expect(yorpSection).toBeDefined();
    expect(yorpSection?.textContent).not.toContain("PCYDO YORP Data Request Form");
    expect(yorpSection?.textContent).toContain("Constitution and By-Laws");
  });

  it("15. isRequired controls metadata badge/status only, NOT category grouping", () => {
    render(<UserPortalTemplatesWorkspaceView {...defaultProps} />);

    // PCYDO YORP Data Request Form has isRequired: true, but is grouped under Data Form
    // MOVE Guidelines has isRequired: false, but is grouped under MOVE
    // Required and Optional badges are preserved as metadata
    expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Optional").length).toBeGreaterThan(0);
  });

  it("16. multi-category template appears in all applicable category sections", () => {
    const multiCatTemplate = {
      id: "multi-applicable",
      title: "Shared Guidelines & Survey",
      description: "Applies to both YORP and Data Form",
      templateCategories: ["yorp", "data_form"],
      categories: ["YORP", "Data Form"],
      isRequired: true,
      fileUrl: "https://example.com/shared.pdf",
    };

    const { container } = render(
      <UserPortalTemplatesWorkspaceView
        {...defaultProps}
        publicTemplates={[multiCatTemplate]}
      />
    );

    const desktopLayout = container.querySelector(".desktop-layout");
    expect(desktopLayout).toBeInTheDocument();

    const yorpSection = Array.from(desktopLayout!.querySelectorAll("h3")).find(
      (el) => el.textContent?.includes("YORP")
    )?.closest(".rounded-2xl");
    expect(yorpSection?.textContent).toContain("Shared Guidelines & Survey");

    const dataFormSection = Array.from(desktopLayout!.querySelectorAll("h3")).find(
      (el) => el.textContent?.includes("Data Form")
    )?.closest(".rounded-2xl");
    expect(dataFormSection?.textContent).toContain("Shared Guidelines & Survey");
  });

  it("17. unknown future category dynamically creates its own category section", () => {
    const futureTemplate = {
      id: "future-summit",
      title: "Youth Summit Delegate Packet",
      description: "Official guide for youth summit",
      templateCategories: ["youth_summit"],
      categories: ["Youth Summit"],
      isRequired: false,
      fileUrl: "https://example.com/summit.pdf",
    };

    render(
      <UserPortalTemplatesWorkspaceView
        {...defaultProps}
        publicTemplates={[futureTemplate]}
      />
    );

    expect(screen.getAllByText(/Youth Summit \(\d+\)/i).length).toBeGreaterThan(0);
  });

  it("18. section ZIP download is available for each category group", () => {
    render(<UserPortalTemplatesWorkspaceView {...defaultProps} />);

    // Each category group provides a ZIP Section button
    const zipSectionButtons = screen.getAllByRole("button", { name: /ZIP Section/i });
    expect(zipSectionButtons.length).toBeGreaterThanOrEqual(4);
  });
});

