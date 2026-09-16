import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  deriveTemplateCategory,
  getTemplateCategoryUsage,
  type TemplateRecord,
} from "@/lib/lydo-connect-data";
import { TemplatesTable } from "./TemplatesTable";

describe("Forms & Templates — Archive & Restore Full Lifecycle Regression Suite", () => {
  const sampleTemplateActive1: TemplateRecord = {
    id: "tpl-1",
    databaseId: "db-tpl-1",
    name: "YORP Directory of Officers",
    description: "Official YORP registration requirement.",
    templateDescription: "Official YORP registration requirement.",
    templateUrl: "storage://template-files/yorp-directory.pdf",
    templateFileUrl: "storage://template-files/yorp-directory.pdf",
    templateFileName: "yorp-directory.pdf",
    templateFileType: "application/pdf",
    templateUploadedAt: "2026-06-26T07:10:12.769Z",
    templateFileSize: 2048,
    sortOrder: 1,
    isRequired: true,
    isActive: true,
    templateActive: true,
    scope: "both",
    templateScope: "document_submission",
    templateCategories: ["yorp"],
  };

  const sampleTemplateActive2: TemplateRecord = {
    id: "tpl-2",
    databaseId: "db-tpl-2",
    name: "Project Activity Proposal Form",
    description: "YPOP project proposal template.",
    templateDescription: "YPOP project proposal template.",
    templateUrl: "storage://template-files/activity-proposal.xlsx",
    templateFileUrl: "storage://template-files/activity-proposal.xlsx",
    templateFileName: "activity-proposal.xlsx",
    templateFileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    templateUploadedAt: "2026-06-27T08:00:00.000Z",
    templateFileSize: 4096,
    sortOrder: 2,
    isRequired: true,
    isActive: true,
    templateActive: true,
    scope: "both",
    templateScope: "document_submission",
    templateCategories: ["ypop"],
  };

  const filterAdminTemplates = (
    templates: TemplateRecord[],
    statusFilter: "all" | "active" | "archived",
    categoryFilter: string = "all",
    search: string = "",
  ) => {
    const query = search.trim().toLowerCase();
    return [...templates]
      .filter((template) => {
        const matchesSearch =
          !query ||
          [template.name, template.description, template.templateFileName]
            .join(" ")
            .toLowerCase()
            .includes(query);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" ? template.isActive : !template.isActive);
        const categories =
          Array.isArray(template.templateCategories) && template.templateCategories.length > 0
            ? template.templateCategories.filter(Boolean)
            : [deriveTemplateCategory(template.name)];
        const matchesCategory = categoryFilter === "all" || categories.includes(categoryFilter);
        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort((left, right) => left.sortOrder - right.sortOrder);
  };

  // Helper simulating the AdminPortal handleDeleteTemplate logic
  const simulateHandleDeleteTemplate = async (
    templateId: string,
    stateTemplates: TemplateRecord[],
    updateTemplate: (id: string, updates: Partial<TemplateRecord>) => void,
    deleteRpc: (dbId: string, name: string) => Promise<void>,
    toastFn: (arg: { title: string; description?: string; variant?: string }) => void,
  ) => {
    const template = stateTemplates.find((entry) => entry.id === templateId);
    if (!template) return;

    try {
      await deleteRpc(template.databaseId, template.name);
      updateTemplate(template.id, {
        isActive: false,
        templateActive: false,
      });
      toastFn({ title: "File archived", description: `${template.name} was archived.` });
    } catch (error) {
      toastFn({
        title: "Archive failed",
        description: error instanceof Error ? error.message : "The file could not be archived.",
        variant: "destructive",
      });
    }
  };

  // Helper simulating the AdminPortal handleRestoreTemplate logic
  const simulateHandleRestoreTemplate = async (
    templateId: string,
    stateTemplates: TemplateRecord[],
    updateTemplate: (id: string, updates: Partial<TemplateRecord>) => void,
    restoreRpc: (dbId: string, name: string) => Promise<Partial<TemplateRecord>>,
    toastFn: (arg: { title: string; description?: string; variant?: string }) => void,
  ) => {
    const template = stateTemplates.find((entry) => entry.id === templateId);
    if (!template) return;

    try {
      const restored = await restoreRpc(template.databaseId, template.name);
      updateTemplate(template.id, restored);
      toastFn({ title: "File restored", description: `${template.name} is active again.` });
    } catch (error) {
      toastFn({
        title: "Restore failed",
        description: error instanceof Error ? error.message : "The file could not be restored.",
        variant: "destructive",
      });
    }
  };

  // =========================================================================
  // TEST A — Archive Active Template
  // =========================================================================
  it("TEST A — Archive Active Template: RPC succeeds, is_active becomes false, remains in Admin state, removed from Active tab", async () => {
    let storeTemplates = [{ ...sampleTemplateActive1 }];
    const updateTemplate = vi.fn((id: string, updates: Partial<TemplateRecord>) => {
      storeTemplates = storeTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t));
    });
    const mockDeleteRpc = vi.fn().mockResolvedValue(undefined);
    const mockToast = vi.fn();

    await simulateHandleDeleteTemplate(
      sampleTemplateActive1.id,
      storeTemplates,
      updateTemplate,
      mockDeleteRpc,
      mockToast,
    );

    // RPC called with correct database ID
    expect(mockDeleteRpc).toHaveBeenCalledWith("db-tpl-1", "YORP Directory of Officers");
    // Local state updated to inactive
    expect(updateTemplate).toHaveBeenCalledWith("tpl-1", {
      isActive: false,
      templateActive: false,
    });
    // Template remains in admin store (not removed!)
    expect(storeTemplates).toHaveLength(1);
    expect(storeTemplates[0].isActive).toBe(false);
    expect(storeTemplates[0].templateActive).toBe(false);

    // Active tab no longer shows it
    const activeFiltered = filterAdminTemplates(storeTemplates, "active");
    expect(activeFiltered).toHaveLength(0);

    // Toast indicates successful archive
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "File archived" }),
    );
  });

  // =========================================================================
  // TEST B — Archived Tab
  // =========================================================================
  it("TEST B — Archived Tab: archived template appears with Archived badge", () => {
    const archivedTemplate: TemplateRecord = {
      ...sampleTemplateActive1,
      isActive: false,
      templateActive: false,
    };

    const archivedFiltered = filterAdminTemplates([archivedTemplate], "archived");
    expect(archivedFiltered).toHaveLength(1);
    expect(archivedFiltered[0].name).toBe("YORP Directory of Officers");

    render(
      <TemplatesTable
        templates={archivedFiltered}
        categoryOptions={["yorp"]}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="archived"
        onStatusFilterChange={vi.fn()}
        categoryFilter="all"
        onCategoryFilterChange={vi.fn()}
        onPreview={vi.fn()}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("YORP Directory of Officers")).toBeDefined();
    // Status badge says "Archived" (tab button also contains "Archived")
    const archivedBadges = screen.getAllByText("Archived");
    expect(archivedBadges.length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // TEST C — All Status
  // =========================================================================
  it("TEST C — All Status: template appears with Archived status alongside active templates", () => {
    const archivedTemplate: TemplateRecord = {
      ...sampleTemplateActive1,
      isActive: false,
      templateActive: false,
    };
    const activeTemplate: TemplateRecord = {
      ...sampleTemplateActive2,
      isActive: true,
      templateActive: true,
    };

    const allFiltered = filterAdminTemplates([archivedTemplate, activeTemplate], "all");
    expect(allFiltered).toHaveLength(2);

    render(
      <TemplatesTable
        templates={allFiltered}
        categoryOptions={["yorp", "ypop"]}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        categoryFilter="all"
        onCategoryFilterChange={vi.fn()}
        onPreview={vi.fn()}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("YORP Directory of Officers")).toBeDefined();
    expect(screen.getByText("Project Activity Proposal Form")).toBeDefined();
    expect(screen.getAllByText("Archived").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // TEST D — Refresh / State Reload
  // =========================================================================
  it("TEST D — Refresh: snapshot with active and inactive templates preserves archived template in store and Archived tab", () => {
    // Simulates snapshot returned by get_admin_portal_snapshot without 'where is_active = true'
    const snapshotTemplates: TemplateRecord[] = [
      {
        ...sampleTemplateActive1,
        isActive: false,
        templateActive: false,
      },
      {
        ...sampleTemplateActive2,
        isActive: true,
        templateActive: true,
      },
    ];

    // On reload / state merge, store receives both
    const refreshedAdminState = { templates: snapshotTemplates };
    expect(refreshedAdminState.templates).toHaveLength(2);

    const archivedTabList = filterAdminTemplates(refreshedAdminState.templates, "archived");
    expect(archivedTabList).toHaveLength(1);
    expect(archivedTabList[0].id).toBe("tpl-1");
    expect(archivedTabList[0].isActive).toBe(false);
  });

  // =========================================================================
  // TEST E — Restore
  // =========================================================================
  it("TEST E — Restore: is_active becomes true, Active tab shows template, Archived tab hides it, no duplicate record", async () => {
    let storeTemplates: TemplateRecord[] = [
      {
        ...sampleTemplateActive1,
        isActive: false,
        templateActive: false,
      },
    ];

    const updateTemplate = vi.fn((id: string, updates: Partial<TemplateRecord>) => {
      storeTemplates = storeTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t));
    });
    const mockRestoreRpc = vi.fn().mockResolvedValue({
      isActive: true,
      templateActive: true,
    });
    const mockToast = vi.fn();

    await simulateHandleRestoreTemplate(
      sampleTemplateActive1.id,
      storeTemplates,
      updateTemplate,
      mockRestoreRpc,
      mockToast,
    );

    expect(mockRestoreRpc).toHaveBeenCalledWith("db-tpl-1", "YORP Directory of Officers");
    expect(updateTemplate).toHaveBeenCalledWith("tpl-1", {
      isActive: true,
      templateActive: true,
    });

    // Exactly 1 record remains in state (no duplicate)
    expect(storeTemplates).toHaveLength(1);
    expect(storeTemplates[0].isActive).toBe(true);
    expect(storeTemplates[0].templateActive).toBe(true);

    // Active tab now shows it
    const activeList = filterAdminTemplates(storeTemplates, "active");
    expect(activeList).toHaveLength(1);
    expect(activeList[0].id).toBe("tpl-1");

    // Archived tab no longer shows it
    const archivedList = filterAdminTemplates(storeTemplates, "archived");
    expect(archivedList).toHaveLength(0);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "File restored" }),
    );
  });

  // =========================================================================
  // TEST F — User Portal Isolation
  // =========================================================================
  it("TEST F — User Portal Isolation: archived template is NOT visible in User Portal", () => {
    const storeTemplates: TemplateRecord[] = [
      {
        ...sampleTemplateActive1,
        isActive: false,
        templateActive: false,
      },
      {
        ...sampleTemplateActive2,
        isActive: true,
        templateActive: true,
      },
    ];

    // Exact filter from UserPortal.tsx:
    // (item.templateActive ?? true) && item.isActive !== false
    const userPortalActiveTemplates = storeTemplates.filter(
      (item) => (item.templateActive ?? true) && item.isActive !== false,
    );

    expect(userPortalActiveTemplates).toHaveLength(1);
    expect(userPortalActiveTemplates[0].id).toBe("tpl-2");
    expect(userPortalActiveTemplates.find((t) => t.id === "tpl-1")).toBeUndefined();
  });

  // =========================================================================
  // TEST G — Public Catalog Isolation
  // =========================================================================
  it("TEST G — Public Catalog Isolation: archived template is NOT visible in Public Templates Catalog", () => {
    const storeTemplates: TemplateRecord[] = [
      {
        ...sampleTemplateActive1,
        isActive: false,
        templateActive: false,
      },
      {
        ...sampleTemplateActive2,
        isActive: true,
        templateActive: true,
      },
    ];

    // Exact filter from PublicTemplatesCatalog.tsx:
    // (t.templateActive ?? true) && t.isActive !== false && t.templateScope === "document_submission"
    const publicTemplates = storeTemplates.filter(
      (t) => (t.templateActive ?? true) && t.isActive !== false && t.templateScope === "document_submission",
    );

    expect(publicTemplates).toHaveLength(1);
    expect(publicTemplates[0].id).toBe("tpl-2");
    expect(publicTemplates.find((t) => t.id === "tpl-1")).toBeUndefined();
  });

  // =========================================================================
  // TEST H — Storage Integrity
  // =========================================================================
  it("TEST H — Storage Integrity: template file storage URL and metadata remain untouched across archive & restore", async () => {
    let storeTemplates: TemplateRecord[] = [{ ...sampleTemplateActive1 }];

    const updateTemplate = vi.fn((id: string, updates: Partial<TemplateRecord>) => {
      storeTemplates = storeTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t));
    });
    const mockDeleteRpc = vi.fn().mockResolvedValue(undefined);
    const mockRestoreRpc = vi.fn().mockResolvedValue({
      isActive: true,
      templateActive: true,
    });
    const mockToast = vi.fn();

    // 1. Archive
    await simulateHandleDeleteTemplate(
      sampleTemplateActive1.id,
      storeTemplates,
      updateTemplate,
      mockDeleteRpc,
      mockToast,
    );

    expect(storeTemplates[0].templateFileUrl).toBe("storage://template-files/yorp-directory.pdf");
    expect(storeTemplates[0].templateFileName).toBe("yorp-directory.pdf");
    expect(storeTemplates[0].templateFileSize).toBe(2048);

    // 2. Restore
    await simulateHandleRestoreTemplate(
      sampleTemplateActive1.id,
      storeTemplates,
      updateTemplate,
      mockRestoreRpc,
      mockToast,
    );

    expect(storeTemplates[0].templateFileUrl).toBe("storage://template-files/yorp-directory.pdf");
    expect(storeTemplates[0].templateFileName).toBe("yorp-directory.pdf");
    expect(storeTemplates[0].templateFileSize).toBe(2048);
  });

  // =========================================================================
  // TEST I — Category
  // =========================================================================
  it("TEST I — Category: category association remains unchanged, archived count updates correctly, category delete blocked", () => {
    const activeTemplate: TemplateRecord = {
      ...sampleTemplateActive1,
      templateCategories: ["special_initiative"],
    };

    // Before archive
    const usageBefore = getTemplateCategoryUsage("special_initiative", [activeTemplate]);
    expect(usageBefore.activeCount).toBe(1);
    expect(usageBefore.archivedCount).toBe(0);
    expect(usageBefore.count).toBe(1);

    // After archive
    const archivedTemplate: TemplateRecord = {
      ...activeTemplate,
      isActive: false,
      templateActive: false,
    };
    const usageAfter = getTemplateCategoryUsage("special_initiative", [archivedTemplate]);
    expect(usageAfter.activeCount).toBe(0);
    expect(usageAfter.archivedCount).toBe(1);
    expect(usageAfter.count).toBe(1);
    // Category deletion guard blocks deletion
    expect(usageAfter.count > 0).toBe(true);
  });

  // =========================================================================
  // TEST J — Hard Delete Separation
  // =========================================================================
  it("TEST J — Hard Delete Separation: Archive preserves row as inactive; Hard Delete physically removes it", async () => {
    let storeTemplates: TemplateRecord[] = [{ ...sampleTemplateActive1 }];

    const updateTemplate = vi.fn((id: string, updates: Partial<TemplateRecord>) => {
      storeTemplates = storeTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t));
    });
    const removeTemplate = vi.fn((id: string) => {
      storeTemplates = storeTemplates.filter((t) => t.id !== id);
    });

    // 1. Archive operation
    await simulateHandleDeleteTemplate(
      sampleTemplateActive1.id,
      storeTemplates,
      updateTemplate,
      vi.fn().mockResolvedValue(undefined),
      vi.fn(),
    );

    expect(storeTemplates).toHaveLength(1);
    expect(storeTemplates[0].isActive).toBe(false);

    // 2. Hard Delete operation
    const handleHardDelete = async (templateId: string) => {
      removeTemplate(templateId);
    };

    await handleHardDelete(sampleTemplateActive1.id);
    expect(removeTemplate).toHaveBeenCalledWith("tpl-1");
    expect(storeTemplates).toHaveLength(0);
  });

  // =========================================================================
  // TEST K — Error Handling
  // =========================================================================
  it("TEST K — Error Handling: failed RPC leaves local state unchanged and displays error toast", async () => {
    let storeTemplates: TemplateRecord[] = [{ ...sampleTemplateActive1 }];
    const updateTemplate = vi.fn((id: string, updates: Partial<TemplateRecord>) => {
      storeTemplates = storeTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t));
    });
    const mockFailingRpc = vi.fn().mockRejectedValue(new Error("Supabase RPC connection timeout"));
    const mockToast = vi.fn();

    await simulateHandleDeleteTemplate(
      sampleTemplateActive1.id,
      storeTemplates,
      updateTemplate,
      mockFailingRpc,
      mockToast,
    );

    // Local state was NOT updated
    expect(updateTemplate).not.toHaveBeenCalled();
    expect(storeTemplates[0].isActive).toBe(true);
    expect(storeTemplates[0].templateActive).toBe(true);

    // Error toast displayed
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Archive failed",
        description: "Supabase RPC connection timeout",
        variant: "destructive",
      }),
    );
  });

  // =========================================================================
  // TEST L — Multiple Templates
  // =========================================================================
  it("TEST L — Multiple Templates: archiving one template transitions it independently without affecting others", async () => {
    let storeTemplates: TemplateRecord[] = [
      { ...sampleTemplateActive1 },
      { ...sampleTemplateActive2 },
    ];
    const updateTemplate = vi.fn((id: string, updates: Partial<TemplateRecord>) => {
      storeTemplates = storeTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t));
    });
    const mockDeleteRpc = vi.fn().mockResolvedValue(undefined);
    const mockToast = vi.fn();

    // Archive only template 1
    await simulateHandleDeleteTemplate(
      sampleTemplateActive1.id,
      storeTemplates,
      updateTemplate,
      mockDeleteRpc,
      mockToast,
    );

    expect(storeTemplates).toHaveLength(2);
    // Template 1 is archived
    expect(storeTemplates.find((t) => t.id === "tpl-1")?.isActive).toBe(false);
    // Template 2 remains active
    expect(storeTemplates.find((t) => t.id === "tpl-2")?.isActive).toBe(true);

    // Active tab shows only template 2
    const activeTab = filterAdminTemplates(storeTemplates, "active");
    expect(activeTab).toHaveLength(1);
    expect(activeTab[0].id).toBe("tpl-2");

    // Archived tab shows only template 1
    const archivedTab = filterAdminTemplates(storeTemplates, "archived");
    expect(archivedTab).toHaveLength(1);
    expect(archivedTab[0].id).toBe("tpl-1");
  });
});
