import { ClipboardList, Download, Eye, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { toast } from "@/hooks/use-toast";

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
    const iconTone =
      tone === "blue"
        ? "bg-blue-100 text-blue-600"
        : "bg-emerald-100 text-emerald-600";

    return (
      <div
        key={template.id}
        className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="flex min-h-[88px] items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
            {tone === "blue" ? (
              <FileText className="h-5 w-5" />
            ) : (
              <ClipboardList className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[1.05rem] font-semibold leading-snug text-foreground">
              {template.name}
            </p>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {template.description || fallbackDescription}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {template.templateUploadedAt
              ? `Updated ${new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "long", day: "numeric" }).format(new Date(template.templateUploadedAt))}`
              : "Template file will appear here once uploaded by the admin."}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={!template.templateFileUrl || openingTemplateId === template.name}
            onClick={() => void openTemplate(template.templateFileUrl, template.name)}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            {openingTemplateId === template.name ? "Opening..." : "View Template"}
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
    <div className="space-y-8">
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

      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold text-foreground">Document Submission Templates</h3>
              <p className="text-sm text-muted-foreground">Official forms and compliance documents published by the admin.</p>
            </div>
          </div>
          {publicDocumentTemplates.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold text-foreground">Other Templates</h3>
              <p className="text-sm text-muted-foreground">Additional downloadable references that the admin has made available to organizations.</p>
            </div>
          </div>
          {publicOtherTemplates.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
