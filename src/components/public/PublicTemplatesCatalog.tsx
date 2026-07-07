import { ClipboardList, Download, Eye, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { toast } from "@/hooks/use-toast";
import { UserFeatureIcon } from "@/components/portal/UserFeatureIcon";

type PublicTemplatesCatalogProps = {
  compactHeader?: boolean;
};

const PublicTemplatesCatalog = ({ compactHeader = false }: PublicTemplatesCatalogProps) => {
  const { state } = useLydoConnect();
  const [openingTemplateId, setOpeningTemplateId] = useState<string | null>(null);

  const publicDocumentTemplates = useMemo(
    () =>
      [...state.templates]
        .filter((template) => template.templateActive && template.isActive && template.templateScope === "document_submission")
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [state.templates],
  );

  const publicOtherTemplates = useMemo(
    () =>
      [...state.templates]
        .filter((template) => template.templateActive && template.isActive && template.templateScope === "other")
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [state.templates],
  );

  const openTemplate = async (fileUrl: string, fileName: string) => {
    if (!fileUrl) return;
    setOpeningTemplateId(fileName);
    try {
      const resolvedUrl = await resolveSupabaseFileUrl(fileUrl);
      window.open(resolvedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Unable to open template",
        description: error instanceof Error ? error.message : "The template file could not be opened.",
        variant: "destructive",
      });
    } finally {
      setOpeningTemplateId(null);
    }
  };

  const renderTemplateCard = (
    template: (typeof state.templates)[number],
    tone: "blue" | "emerald",
    fallbackDescription: string,
  ) => {
    return (
      <div
        key={template.id}
        className="template-item flex h-full flex-col rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md lg:p-5"
      >
        <div className="template-item-main grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 lg:flex lg:min-h-[88px]">
          <UserFeatureIcon
            icon={tone === "blue" ? FileText : ClipboardList}
            className="template-item-icon"
          />
          <div className="template-item-content min-w-0 flex-1">
            <p className="text-[0.98rem] font-semibold leading-snug text-foreground lg:line-clamp-2 lg:text-[1.05rem]">
              {template.name}
            </p>
            <p className="template-item-description mt-1.5 line-clamp-3 text-[0.875rem] leading-relaxed text-muted-foreground lg:mt-2 lg:line-clamp-2 lg:text-sm">
              {template.description || fallbackDescription}
            </p>
            <span className="template-updated-date mt-1.5 block text-[0.78rem] text-muted-foreground lg:hidden">
              {template.templateUploadedAt
                ? `Updated ${new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(template.templateUploadedAt))}`
                : "Template file will appear here once uploaded by the admin."}
            </span>
          </div>
        </div>

        <div className="mt-4 hidden rounded-xl border border-border/70 bg-muted/20 px-4 py-3 lg:block">
          <p className="text-xs text-muted-foreground">
            {template.templateUploadedAt
              ? `Updated ${new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "long", day: "numeric" }).format(new Date(template.templateUploadedAt))}`
              : "Template file will appear here once uploaded by the admin."}
          </p>
        </div>

        <div className="template-item-actions mt-3 grid grid-cols-2 gap-2 lg:mt-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={!template.templateFileUrl || openingTemplateId === template.name}
            onClick={() => void openTemplate(template.templateFileUrl, template.name)}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            {openingTemplateId === template.name ? "Opening..." : (
              <>
                <span className="lg:hidden">View</span>
                <span className="hidden lg:inline">View Template</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={!template.templateFileUrl || openingTemplateId === template.name}
            onClick={() => void openTemplate(template.templateFileUrl, template.name)}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 lg:space-y-8">
      {!compactHeader ? (
        <div className="mb-10 mx-auto max-w-2xl text-center sm:mb-14">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-primary">
            Templates
          </span>
          <h2 className="mb-3 text-[1.6rem] font-heading font-bold text-foreground sm:text-3xl md:text-4xl">
            Download the latest portal templates
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Access the published document submission and other shared templates before creating your organization account or opening the portal.
          </p>
        </div>
      ) : null}

      <div className="space-y-8 lg:space-y-8">
        <div className="space-y-4">
          <div className="template-category-header grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 lg:flex lg:items-center">
            <UserFeatureIcon icon={FileText} />
            <div className="template-category-header-content min-w-0">
              <h3 className="font-heading text-lg font-bold text-foreground lg:text-xl">Document Submission Templates</h3>
              <p className="text-sm text-muted-foreground">Official forms and compliance documents published by the admin.</p>
            </div>
          </div>
          {publicDocumentTemplates.length ? (
            <div className="template-list grid gap-3 md:grid-cols-2 xl:grid-cols-3 lg:gap-4">
              {publicDocumentTemplates.map((template) =>
                renderTemplateCard(template, "blue", "Shared compliance form ready for preview and download."),
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
              No document submission templates are available right now.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="template-category-header grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 lg:flex lg:items-center">
            <UserFeatureIcon icon={ClipboardList} />
            <div className="template-category-header-content min-w-0">
              <h3 className="font-heading text-lg font-bold text-foreground lg:text-xl">Other Templates</h3>
              <p className="text-sm text-muted-foreground">Additional downloadable references that the admin has made available to organizations.</p>
            </div>
          </div>
          {publicOtherTemplates.length ? (
            <div className="template-list grid gap-3 md:grid-cols-2 xl:grid-cols-3 lg:gap-4">
              {publicOtherTemplates.map((template) =>
                renderTemplateCard(template, "emerald", "Shared reference template ready for preview and download."),
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
              No other templates are available right now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicTemplatesCatalog;
