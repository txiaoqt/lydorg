import { ClipboardList, Download, Eye, FileText, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { toast } from "@/hooks/use-toast";

type FilterId = "all" | "document_submission" | "other";

type PublicTemplatesCatalogProps = {
  compactHeader?: boolean;
  searchTerm?: string;
};

const filterTabs: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "document_submission", label: "Document Submission" },
  { id: "other", label: "Other Templates" },
];

const categoryDefs: {
  id: "document_submission" | "other";
  icon: LucideIcon;
  title: string;
  subtitle: string;
  fallback: string;
  empty: string;
}[] = [
  {
    id: "document_submission",
    icon: FileText,
    title: "Document Submission Templates",
    subtitle: "Official forms and compliance documents published by the admin.",
    fallback: "Shared compliance form ready for preview and download.",
    empty: "No document submission templates are available right now.",
  },
  {
    id: "other",
    icon: ClipboardList,
    title: "Other Templates",
    subtitle: "Additional downloadable references that the admin has made available to organizations.",
    fallback: "Shared reference template ready for preview and download.",
    empty: "No other templates are available right now.",
  },
];

const getFileType = (url: string | null | undefined): string => {
  if (!url) return "FILE";
  const ext = url.split(".").pop()?.split("?")[0].toUpperCase() ?? "FILE";
  return ext.length <= 5 ? ext : "FILE";
};

const PublicTemplatesCatalog = ({ compactHeader = false, searchTerm = "" }: PublicTemplatesCatalogProps) => {
  const { state } = useLydoConnect();
  const [openingTemplateId, setOpeningTemplateId] = useState<string | null>(null);
  const [downloadingTemplateId, setDownloadingTemplateId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");

  const query = searchTerm.trim().toLowerCase();

  const publicDocumentTemplates = useMemo(
    () =>
      [...state.templates]
        .filter((t) => t.templateActive && t.isActive && t.templateScope === "document_submission")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.templates],
  );

  const publicOtherTemplates = useMemo(
    () =>
      [...state.templates]
        .filter((t) => t.templateActive && t.isActive && t.templateScope === "other")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.templates],
  );

  const applySearch = (templates: typeof state.templates) => {
    if (!query) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.description ?? "").toLowerCase().includes(query),
    );
  };

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

  const downloadTemplate = async (fileUrl: string, fileName: string) => {
    if (!fileUrl) return;
    setDownloadingTemplateId(fileName);
    try {
      const resolvedUrl = await resolveSupabaseFileUrl(fileUrl);
      const response = await fetch(resolvedUrl);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "The template file could not be downloaded.",
        variant: "destructive",
      });
    } finally {
      setDownloadingTemplateId(null);
    }
  };

  const renderTemplateCard = (
    template: (typeof state.templates)[number],
    fallbackDescription: string,
  ) => {
    const fileType = getFileType(template.templateFileUrl);
    const formattedDate = template.templateUploadedAt
      ? `Updated ${new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(template.templateUploadedAt))}`
      : "Upload date unavailable";
    const isOpening = openingTemplateId === template.name;
    const isDownloading = downloadingTemplateId === template.name;
    const viewDisabled = !template.templateFileUrl || isOpening;
    const downloadDisabled = !template.templateFileUrl || isDownloading;

    return (
      <div
        key={template.id}
        className="group flex h-full flex-col justify-between rounded-xl border border-public-border-default bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-public-border-brand/50 hover:shadow-md sm:p-6"
      >
        <div className="flex flex-1 flex-col gap-3">
          {/* Header row: File Type Badge + Upload Date */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-public-bg-tertiary-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-public-text-brand border border-public-border-brand/20">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              {fileType}
            </span>
            <span className="font-segoe text-xs text-public-text-secondary">
              {formattedDate}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-segoe text-lg font-bold leading-snug tracking-tight text-public-text-brand group-hover:text-primary transition-colors">
            {template.name}
          </h3>

          {/* Description */}
          <p className="font-segoe text-sm leading-relaxed text-public-text-neutral-default line-clamp-3">
            {template.description || fallbackDescription}
          </p>
        </div>

        {/* Divider + Actions */}
        <div className="mt-5 border-t border-public-border-default pt-4 flex gap-2.5">
          <button
            type="button"
            disabled={viewDisabled}
            onClick={() => void openTemplate(template.templateFileUrl, template.name)}
            className="flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-public-border-brand bg-white px-3 font-segoe text-xs font-semibold text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <Eye className="h-4 w-4 shrink-0" />
            <span>{isOpening ? "Opening…" : "View"}</span>
          </button>
          <button
            type="button"
            disabled={downloadDisabled}
            onClick={() => void downloadTemplate(template.templateFileUrl, template.name)}
            className="flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-public-bg-brand px-3 font-segoe text-xs font-semibold text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span>{isDownloading ? "Downloading…" : "Download"}</span>
          </button>
        </div>
      </div>
    );
  };

  const templatesByCategory = {
    document_submission: applySearch(publicDocumentTemplates),
    other: applySearch(publicOtherTemplates),
  };

  return (
    <div className="flex flex-col gap-8">

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 sm:justify-center">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={
              activeFilter === tab.id
                ? "shrink-0 whitespace-nowrap rounded-full bg-public-bg-brand px-5 py-2 font-segoe text-xs font-semibold text-public-text-on-brand shadow-sm transition-all"
                : "shrink-0 whitespace-nowrap rounded-full border border-public-border-default bg-white px-5 py-2 font-segoe text-xs font-medium text-public-text-neutral-default hover:bg-muted/50 transition-all"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category sections */}
      {categoryDefs
        .filter((cat) => activeFilter === "all" || activeFilter === cat.id)
        .map((cat) => {
          const Icon = cat.icon;
          const templates = templatesByCategory[cat.id];
          return (
            <div key={cat.id} className="flex flex-col gap-4">

              {/* Category header */}
              <div className="flex items-start gap-3.5 border-b border-public-border-default/60 pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-public-bg-tertiary-100 p-2 text-public-text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <h2 className="font-segoe text-xl font-bold text-public-text-brand tracking-tight">
                    {cat.title}
                  </h2>
                  <p className="font-segoe text-xs sm:text-sm text-public-text-secondary leading-relaxed">
                    {cat.subtitle}
                  </p>
                </div>
              </div>

              {/* Cards or empty state */}
              {templates.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                  {templates.map((t) => renderTemplateCard(t, cat.fallback))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-public-border-default bg-white/60 p-8 text-center font-segoe text-sm text-public-text-secondary">
                  {cat.empty}
                </div>
              )}

            </div>
          );
        })}

    </div>
  );
};

export default PublicTemplatesCatalog;
