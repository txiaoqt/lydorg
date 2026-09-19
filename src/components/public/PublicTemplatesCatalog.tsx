import React, { useState, useMemo } from "react";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import {
  deriveTemplateCategory,
  formatTemplateCategoryDropdownLabel,
} from "@/lib/lydo-connect-data";
import { UserPortalTemplatesWorkspaceView } from "@/components/portal/UserPortalTemplatesWorkspaceView";
import { PortalDocumentPreviewModal } from "@/components/portal/PortalDocumentPreviewModal";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { toast } from "@/hooks/use-toast";

export type PublicTemplatesCatalogProps = {
  compactHeader?: boolean;
  searchTerm?: string;
  externalSearchTerm?: string;
  onSearchChange?: (val: string) => void;
};

export default function PublicTemplatesCatalog({
  compactHeader = false,
}: PublicTemplatesCatalogProps) {
  const { state } = useLydoConnect();

  // Preview Modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewCanInline, setPreviewCanInline] = useState(true);
  const [previewEmptyMessage, setPreviewEmptyMessage] = useState("");

  // Map state.templates using the authoritative User Portal mapping logic
  const allPublicTemplates = useMemo(() => {
    const activeTemplates = (state.templates || []).filter(
      (template) => (template.templateActive ?? true) && template.isActive !== false,
    );

    const seen = new Set<string>();
    const uniqueTemplates: typeof activeTemplates = [];
    for (const t of activeTemplates) {
      const key = t.databaseId || t.id;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTemplates.push(t);
      }
    }

    uniqueTemplates.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return uniqueTemplates.map((t) => {
      const rawCategories = Array.isArray(t.templateCategories) && t.templateCategories.length > 0
        ? t.templateCategories
        : (t as any).template_category && Array.isArray((t as any).template_category) && (t as any).template_category.length > 0
        ? (t as any).template_category
        : (t as any).category
        ? [(t as any).category]
        : [];

      const effectiveRawCategories = rawCategories.length > 0
        ? rawCategories
        : [deriveTemplateCategory(t.name)];

      const formattedCategories = effectiveRawCategories.map((cat) =>
        formatTemplateCategoryDropdownLabel(cat),
      );

      return {
        id: t.id,
        databaseId: t.databaseId || t.id,
        title: t.name,
        name: t.name,
        description: t.description || t.templateDescription || "",
        fileUrl: t.templateFileUrl || (t as any).fileUrl || (t as any).templateUrl,
        fileSize: t.templateFileSize ?? (t as any).fileSize ?? (t as any).file_size ?? (t as any).size ?? null,
        category: formattedCategories[0] || "General",
        categories: formattedCategories,
        rawCategories: effectiveRawCategories,
        templateCategories: effectiveRawCategories,
        isRequired: t.isRequired ?? (t.templateScope === "document_submission"),
        updatedAt: t.templateUploadedAt || (t as any).updatedAt || (t as any).updated_at || null,
        sortOrder: t.sortOrder,
        templateScope: t.templateScope,
      };
    });
  }, [state.templates]);

  const openPreview = async (fileUrl: string | undefined, fileName: string) => {
    if (!fileUrl || !fileUrl.trim() || fileUrl.startsWith("#")) {
      setPreviewUrl("");
      setPreviewTitle(fileName);
      setPreviewEmptyMessage("No file available for preview yet.");
      setPreviewCanInline(false);
      setPreviewModalOpen(true);
      return;
    }

    try {
      const resolvedUrl = await resolveSupabaseFileUrl(fileUrl);
      if (!resolvedUrl) {
        throw new Error("No file is available yet.");
      }

      setPreviewUrl(resolvedUrl);
      setPreviewTitle(fileName);
      setPreviewEmptyMessage("");
      setPreviewCanInline(
        resolvedUrl.includes("application/pdf") ||
        fileUrl.toLowerCase().endsWith(".pdf") ||
        resolvedUrl.toLowerCase().includes(".pdf") ||
        (!fileUrl.toLowerCase().endsWith(".xlsx") && !fileUrl.toLowerCase().endsWith(".docx"))
      );
      setPreviewModalOpen(true);
    } catch (error) {
      toast({
        title: "Unable to preview template",
        description: error instanceof Error ? error.message : "The template file could not be opened.",
        variant: "destructive",
      });
    }
  };

  const openFile = (url: string, name: string) => {
    void openPreview(url, name);
  };

  return (
    <>
      <UserPortalTemplatesWorkspaceView
        publicTemplates={allPublicTemplates}
        openPreview={openPreview}
        openFile={openFile}
        compactHeader={compactHeader}
      />

      <PortalDocumentPreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        fileUrl={previewUrl}
        fileName={previewTitle}
        canInlinePreview={previewCanInline}
        emptyMessage={previewEmptyMessage}
      />
    </>
  );
}
