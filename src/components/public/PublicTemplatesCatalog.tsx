import React, { useState, useMemo } from "react";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import {
  deriveTemplateCategory,
  formatTemplateCategoryDropdownLabel,
  resolveCleanTemplateDownloadFileName,
} from "@/lib/lydo-connect-data";
import { UserPortalTemplatesWorkspaceView } from "@/components/portal/UserPortalTemplatesWorkspaceView";
import { PortalDocumentDrawer } from "@/components/portal/PortalDocumentDrawer";
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

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewCanInline, setPreviewCanInline] = useState(true);
  const [previewEmptyMessage, setPreviewEmptyMessage] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

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
      setDrawerOpen(true);
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
      setDrawerOpen(true);
    } catch (error) {
      toast({
        title: "Unable to preview template",
        description: error instanceof Error ? error.message : "The template file could not be opened.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = async (url: string, name: string) => {
    if (!url || url.startsWith("#")) {
      toast({
        title: "Download unavailable",
        description: "No file is available for download yet.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const resolvedUrl = (await resolveSupabaseFileUrl(url)) || url;
      const downloadName = resolveCleanTemplateDownloadFileName(name, url || resolvedUrl);
      const response = await fetch(resolvedUrl);
      if (!response.ok) {
        throw new Error(`Unable to download ${downloadName}.`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "The file could not be downloaded.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
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

      <PortalDocumentDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setPreviewUrl("");
            setPreviewTitle("");
            setPreviewEmptyMessage("");
            setPreviewCanInline(false);
          }
        }}
        mode="template"
        previewUrl={previewUrl}
        previewTitle={previewTitle}
        templateTitle={previewTitle}
        templateFileName={previewTitle}
        previewCanInline={previewCanInline}
        previewEmptyMessage={previewEmptyMessage}
        organizationName="PCYDO Pasig City"
        downloading={isDownloading}
        onDownloadFile={handleDownloadFile}
        onOpenInNewTab={(url) => {
          if (url) {
            window.open(url, "_blank", "noopener,noreferrer");
          }
        }}
      />
    </>
  );
}
