import React, { useMemo, useState } from "react";
import JSZip from "jszip";
import {
  FileText,
  Download,
  Eye,
  Search,
  ChevronDown,
  Filter,
  FolderArchive,
  Loader2,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { PortalDocumentPreviewModal } from "@/components/portal/PortalDocumentPreviewModal";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type FilterId = "all" | "document_submission" | "other";

type PublicTemplatesCatalogProps = {
  compactHeader?: boolean;
  searchTerm?: string;
  externalSearchTerm?: string;
  onSearchChange?: (val: string) => void;
};

export default function PublicTemplatesCatalog({
  compactHeader = false,
  searchTerm = "",
  externalSearchTerm,
  onSearchChange,
}: PublicTemplatesCatalogProps) {
  const { state } = useLydoConnect();
  const [internalSearch, setInternalSearch] = useState("");
  const [openingTemplateId, setOpeningTemplateId] = useState<string | null>(null);
  const [downloadingTemplateId, setDownloadingTemplateId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [requiredOpen, setRequiredOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);

  const currentSearchTerm = externalSearchTerm !== undefined ? externalSearchTerm : (searchTerm || internalSearch);
  const query = currentSearchTerm.trim().toLowerCase();

  const handleSearchInputChange = (val: string) => {
    setInternalSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

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

  const filteredDocTemplates = applySearch(publicDocumentTemplates);
  const filteredOtherTemplates = applySearch(publicOtherTemplates);

  // Category-level templates (independent of search query for ZIP download & counter)
  const categoryTemplates = useMemo(() => {
    if (activeFilter === "document_submission") return publicDocumentTemplates;
    if (activeFilter === "other") return publicOtherTemplates;
    return [...publicDocumentTemplates, ...publicOtherTemplates];
  }, [activeFilter, publicDocumentTemplates, publicOtherTemplates]);

  const categoryDownloadableTemplates = useMemo(() => {
    return categoryTemplates.filter((t) => {
      const url = t.templateFileUrl || t.templateUrl;
      return Boolean(url && url.trim() && !url.startsWith("#"));
    });
  }, [categoryTemplates]);

  const categoryDownloadableCount = categoryDownloadableTemplates.length;
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);

  const getZipFileName = (filter: FilterId) => {
    if (filter === "document_submission") return "Y-TRACE-Templates-Required-Documents.zip";
    if (filter === "other") return "Y-TRACE-Templates-Reference-Guides.zip";
    return "Y-TRACE-Templates-All.zip";
  };

  const downloadCategoryZip = async () => {
    if (isGeneratingZip) return;
    if (categoryDownloadableTemplates.length === 0) {
      toast({
        title: "No downloadable templates",
        description: "There are no downloadable template files in this category.",
      });
      return;
    }

    setIsGeneratingZip(true);
    try {
      const zip = new JSZip();
      let addedCount = 0;

      await Promise.all(
        categoryDownloadableTemplates.map(async (tpl) => {
          const rawUrl = tpl.templateFileUrl || tpl.templateUrl;
          if (!rawUrl) return;

          try {
            const resolvedUrl = await resolveSupabaseFileUrl(rawUrl);
            const response = await fetch(resolvedUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();

            let fileName = tpl.name.trim().replace(/[/\\?%*:|"<>]/g, "-");
            const hasExt = /\.(pdf|docx?|xlsx?|pptx?|zip|png|jpe?g|txt|csv)$/i.test(fileName);
            if (!hasExt) {
              if (resolvedUrl.toLowerCase().includes(".pdf") || blob.type.includes("pdf")) {
                fileName += ".pdf";
              } else if (resolvedUrl.toLowerCase().includes(".docx") || blob.type.includes("word")) {
                fileName += ".docx";
              } else if (resolvedUrl.toLowerCase().includes(".xlsx") || blob.type.includes("sheet") || blob.type.includes("excel")) {
                fileName += ".xlsx";
              } else {
                fileName += ".pdf";
              }
            }

            zip.file(fileName, blob);
            addedCount++;
          } catch (fileErr) {
            console.warn(`Failed to retrieve file for template "${tpl.name}":`, fileErr);
          }
        })
      );

      if (addedCount === 0) {
        throw new Error("Unable to retrieve any template files for the ZIP archive.");
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = zipUrl;
      a.download = getZipFileName(activeFilter);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);

      toast({
        title: "Download complete",
        description: `Successfully downloaded ${addedCount} template file${addedCount > 1 ? "s" : ""} in ${getZipFileName(activeFilter)}.`,
      });
    } catch (error) {
      toast({
        title: "ZIP Download failed",
        description: error instanceof Error ? error.message : "An error occurred while generating the ZIP archive.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingZip(false);
    }
  };

  // Preview Modal States
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewCanInline, setPreviewCanInline] = useState(true);
  const [previewEmptyMessage, setPreviewEmptyMessage] = useState("");

  const openTemplate = async (fileUrl: string | undefined, fileName: string) => {
    if (!fileUrl || !fileUrl.trim() || fileUrl.startsWith("#")) {
      setPreviewUrl("");
      setPreviewTitle(fileName);
      setPreviewEmptyMessage("No file available for preview yet.");
      setPreviewCanInline(false);
      setPreviewModalOpen(true);
      return;
    }

    setOpeningTemplateId(fileName);
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
    } finally {
      setOpeningTemplateId(null);
    }
  };

  const downloadTemplate = async (fileUrl: string | undefined, fileName: string) => {
    if (!fileUrl || !fileUrl.trim() || fileUrl.startsWith("#")) {
      toast({
        title: "Download unavailable",
        description: "No file is available for download yet.",
        variant: "destructive",
      });
      return;
    }
    setDownloadingTemplateId(fileName);
    try {
      const resolvedUrl = await resolveSupabaseFileUrl(fileUrl);
      const response = await fetch(resolvedUrl);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();

      let targetFileName = fileName.trim().replace(/[/\\?%*:|"<>]/g, "-");
      const hasExt = /\.(pdf|docx?|xlsx?|pptx?|zip|png|jpe?g|txt|csv)$/i.test(targetFileName);
      if (!hasExt) {
        if (resolvedUrl.toLowerCase().includes(".pdf") || blob.type.includes("pdf")) {
          targetFileName += ".pdf";
        } else if (resolvedUrl.toLowerCase().includes(".docx") || blob.type.includes("word")) {
          targetFileName += ".docx";
        } else if (resolvedUrl.toLowerCase().includes(".xlsx") || blob.type.includes("sheet") || blob.type.includes("excel")) {
          targetFileName += ".xlsx";
        } else {
          targetFileName += ".pdf";
        }
      }

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = targetFileName;
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

  return (
    <div className="flex flex-col gap-4 sm:gap-6 font-sans">
      {/* Mobile Unified Toolbar: Single Search + [Category: All] [Download ZIP] (visible below md) */}
      <div className="flex flex-col gap-2.5 bg-card border border-border/60 p-2.5 px-3 rounded-2xl shadow-xs md:hidden">
        {/* Full-width Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search templates by title, description, category..."
            value={currentSearchTerm}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            className="h-9 pl-9 pr-3 text-base sm:text-sm rounded-xl bg-background border-border/80 shadow-2xs font-segoe placeholder:text-muted-foreground"
          />
        </div>

        {/* Row 2: Category Button + Download ZIP Button */}
        <div className="flex items-center gap-2">
          {/* Compact Category Dropdown Button */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 flex-1 rounded-xl border-border/80 bg-background text-sm font-semibold gap-1.5 justify-center shadow-2xs cursor-pointer truncate text-primary hover:text-primary hover:bg-primary/5"
              >
                <Filter className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {activeFilter === "all"
                    ? "Category: All"
                    : activeFilter === "document_submission"
                    ? "Category: Required"
                    : "Category: References"}
                </span>
                <ChevronDown className="h-3 w-3 text-primary shrink-0 opacity-70 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-xl bg-card border-border/80 shadow-lg">
              <DropdownMenuItem
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-between",
                  activeFilter === "all" && "bg-primary/10 text-primary font-bold"
                )}
              >
                <span>All Templates</span>
                <span className="text-[10px] text-muted-foreground">({publicDocumentTemplates.length + publicOtherTemplates.length})</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveFilter("document_submission")}
                className={cn(
                  "text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-between",
                  activeFilter === "document_submission" && "bg-primary/10 text-primary font-bold"
                )}
              >
                <span>Required Documents</span>
                <span className="text-[10px] text-muted-foreground">({publicDocumentTemplates.length})</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveFilter("other")}
                className={cn(
                  "text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-between",
                  activeFilter === "other" && "bg-primary/10 text-primary font-bold"
                )}
              >
                <span>Other References</span>
                <span className="text-[10px] text-muted-foreground">({publicOtherTemplates.length})</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Download ZIP Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isGeneratingZip || categoryDownloadableCount === 0}
            onClick={downloadCategoryZip}
            className="h-8 flex-1 rounded-xl border-border/80 bg-background text-sm font-semibold gap-1.5 justify-center shadow-2xs cursor-pointer truncate text-primary hover:text-primary hover:bg-primary/5 disabled:opacity-50"
          >
            {isGeneratingZip ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                <span className="truncate">Preparing ZIP...</span>
              </>
            ) : (
              <>
                <FolderArchive className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">Download ZIP ({categoryDownloadableCount})</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Desktop / Tablet Compact Horizontal Toolbar (visible on md and up) */}
      <div className="hidden md:flex items-center gap-3 bg-card border border-border/60 p-2.5 px-3.5 rounded-2xl shadow-xs">
        {/* Search Input (fills majority of width) */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search templates by title, description, category..."
            value={currentSearchTerm}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            className="h-9 pl-9 pr-3 text-sm rounded-xl bg-background border-border/80 shadow-2xs font-segoe placeholder:text-muted-foreground w-full"
          />
        </div>

        {/* Category Dropdown Button (compact content-width) */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 rounded-xl border-border/80 bg-background text-sm font-semibold gap-2 px-3.5 shadow-2xs cursor-pointer text-primary hover:text-primary hover:bg-primary/5"
            >
              <Filter className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                {activeFilter === "all"
                  ? "Category: All"
                  : activeFilter === "document_submission"
                  ? "Category: Required"
                  : "Category: References"}
              </span>
              <ChevronDown className="h-3 w-3 text-primary shrink-0 opacity-70 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl bg-card border-border/80 shadow-lg">
            <DropdownMenuItem
              onClick={() => setActiveFilter("all")}
              className={cn(
                "text-sm font-semibold rounded-lg cursor-pointer flex items-center justify-between",
                activeFilter === "all" && "bg-primary/10 text-primary font-bold"
              )}
            >
              <span>All Templates</span>
              <span className="text-[10px] text-muted-foreground">({publicDocumentTemplates.length + publicOtherTemplates.length})</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setActiveFilter("document_submission")}
              className={cn(
                "text-sm font-semibold rounded-lg cursor-pointer flex items-center justify-between",
                activeFilter === "document_submission" && "bg-primary/10 text-primary font-bold"
              )}
            >
              <span>Required Documents</span>
              <span className="text-[10px] text-muted-foreground">({publicDocumentTemplates.length})</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setActiveFilter("other")}
              className={cn(
                "text-sm font-semibold rounded-lg cursor-pointer flex items-center justify-between",
                activeFilter === "other" && "bg-primary/10 text-primary font-bold"
              )}
            >
              <span>Other References</span>
              <span className="text-[10px] text-muted-foreground">({publicOtherTemplates.length})</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Download ZIP Button (compact content-width) */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isGeneratingZip || categoryDownloadableCount === 0}
          onClick={downloadCategoryZip}
          className="h-9 shrink-0 rounded-xl border-border/80 bg-background text-sm font-semibold gap-1.5 px-3.5 shadow-2xs cursor-pointer text-primary hover:text-primary hover:bg-primary/5 disabled:opacity-50"
        >
          {isGeneratingZip ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
              <span>Preparing ZIP...</span>
            </>
          ) : (
            <>
              <FolderArchive className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Download ZIP ({categoryDownloadableCount})</span>
            </>
          )}
        </Button>
      </div>

      {/* Section 1: Required Document Templates */}
      {(activeFilter === "all" || activeFilter === "document_submission") && (
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs space-y-0">
          <div
            onClick={() => setRequiredOpen(!requiredOpen)}
            className="p-3.5 sm:p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !requiredOpen && "-rotate-90")} />
              Document Submission Templates ({filteredDocTemplates.length})
            </h3>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold">Mandatory Registration Files</span>
          </div>

          {requiredOpen && (
            <>
              {/* Desktop / Tablet Table View — visible on md and up */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/10 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-5">Document</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredDocTemplates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">No required templates found.</td>
                      </tr>
                    ) : (
                      filteredDocTemplates.map((tpl) => {
                        const rawUrl = tpl.templateFileUrl || tpl.templateUrl;
                        const isOpening = openingTemplateId === tpl.name;
                        const isDownloading = downloadingTemplateId === tpl.name;
                        const viewDisabled = !rawUrl || Boolean(isOpening);
                        const dlDisabled = !rawUrl || Boolean(isDownloading);

                        return (
                          <tr key={tpl.id} className="h-16 hover:bg-primary/5 transition-colors cursor-pointer group">
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-primary shrink-0" />
                                <div className="space-y-0.5">
                                  <p className="text-sm font-bold text-foreground truncate max-w-[320px]">{tpl.name}</p>
                                  <p className="text-[11px] text-muted-foreground truncate max-w-[320px]">{tpl.description || "Official template"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                Approved Standard
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs font-semibold text-muted-foreground">
                              Registration Form
                            </td>
                            <td className="py-3 px-5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={viewDisabled}
                                onClick={() => void openTemplate(rawUrl, tpl.name)}
                                className="h-7 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg cursor-pointer disabled:opacity-50"
                              >
                                {isOpening ? (
                                  <>
                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Opening…
                                  </>
                                ) : (
                                  <>
                                    <Eye className="mr-1 h-3.5 w-3.5" /> View
                                  </>
                                )}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={dlDisabled}
                                onClick={() => void downloadTemplate(rawUrl, tpl.name)}
                                className="h-7 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer disabled:opacity-50"
                              >
                                {isDownloading ? (
                                  <>
                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Downloading…
                                  </>
                                ) : (
                                  <>
                                    <Download className="mr-1 h-3.5 w-3.5" /> Download
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Card View — visible below md */}
              <div className="md:hidden p-3 space-y-3">
                {filteredDocTemplates.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">No required templates found.</p>
                ) : (
                  filteredDocTemplates.map((tpl) => {
                    const rawUrl = tpl.templateFileUrl || tpl.templateUrl;
                    const isOpening = openingTemplateId === tpl.name;
                    const isDownloading = downloadingTemplateId === tpl.name;
                    const viewDisabled = !rawUrl || Boolean(isOpening);
                    const dlDisabled = !rawUrl || Boolean(isDownloading);

                    return (
                      <div
                        key={tpl.id}
                        className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs"
                      >
                        {/* Document Icon & Title Block */}
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h4 className="text-base sm:text-base font-bold text-foreground leading-snug break-words">
                              {tpl.name}
                            </h4>
                            <p className="text-sm sm:text-sm text-muted-foreground leading-relaxed break-words">
                              {tpl.description || "Official template"}
                            </p>
                          </div>
                        </div>

                        {/* Actions: View & Download Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={viewDisabled}
                            onClick={() => void openTemplate(rawUrl, tpl.name)}
                            className="h-8 text-sm font-semibold text-primary border-primary/20 hover:bg-primary/5 rounded-lg flex items-center justify-center cursor-pointer shadow-2xs disabled:opacity-50"
                          >
                            {isOpening ? (
                              <>
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Opening…
                              </>
                            ) : (
                              <>
                                <Eye className="mr-1 h-3.5 w-3.5" /> View
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={dlDisabled}
                            onClick={() => void downloadTemplate(rawUrl, tpl.name)}
                            className="h-8 text-sm font-bold rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Downloading…
                              </>
                            ) : (
                              <>
                                <Download className="mr-1 h-3.5 w-3.5" /> Download
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Section 2: Other Reference Templates */}
      {(activeFilter === "all" || activeFilter === "other") && (
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs space-y-0">
          <div
            onClick={() => setOtherOpen(!otherOpen)}
            className="p-3.5 sm:p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !otherOpen && "-rotate-90")} />
              Other Reference Templates ({filteredOtherTemplates.length})
            </h3>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold">Supplementary Files</span>
          </div>

          {otherOpen && (
            <>
              {/* Desktop / Tablet Table View — visible on md and up */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/10 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-5">Document</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredOtherTemplates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">No other templates found.</td>
                      </tr>
                    ) : (
                      filteredOtherTemplates.map((tpl) => {
                        const rawUrl = tpl.templateFileUrl || tpl.templateUrl;
                        const isOpening = openingTemplateId === tpl.name;
                        const isDownloading = downloadingTemplateId === tpl.name;
                        const viewDisabled = !rawUrl || Boolean(isOpening);
                        const dlDisabled = !rawUrl || Boolean(isDownloading);

                        return (
                          <tr key={tpl.id} className="h-16 hover:bg-primary/5 transition-colors cursor-pointer group">
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-3">
                                <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                                <div className="space-y-0.5">
                                  <p className="text-sm font-bold text-foreground truncate max-w-[320px]">{tpl.name}</p>
                                  <p className="text-[11px] text-muted-foreground truncate max-w-[320px]">{tpl.description || "Reference template"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-accent px-2.5 py-0.5 rounded-full border border-border/60">
                                Reference
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs font-semibold text-muted-foreground">
                              Reference Guide
                            </td>
                            <td className="py-3 px-5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={viewDisabled}
                                onClick={() => void openTemplate(rawUrl, tpl.name)}
                                className="h-7 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg cursor-pointer disabled:opacity-50"
                              >
                                {isOpening ? (
                                  <>
                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Opening…
                                  </>
                                ) : (
                                  <>
                                    <Eye className="mr-1 h-3.5 w-3.5" /> View
                                  </>
                                )}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={dlDisabled}
                                onClick={() => void downloadTemplate(rawUrl, tpl.name)}
                                className="h-7 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer disabled:opacity-50"
                              >
                                {isDownloading ? (
                                  <>
                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Downloading…
                                  </>
                                ) : (
                                  <>
                                    <Download className="mr-1 h-3.5 w-3.5" /> Download
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Card View — visible below md */}
              <div className="md:hidden p-3 space-y-3">
                {filteredOtherTemplates.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">No other templates found.</p>
                ) : (
                  filteredOtherTemplates.map((tpl) => {
                    const rawUrl = tpl.templateFileUrl || tpl.templateUrl;
                    const isOpening = openingTemplateId === tpl.name;
                    const isDownloading = downloadingTemplateId === tpl.name;
                    const viewDisabled = !rawUrl || Boolean(isOpening);
                    const dlDisabled = !rawUrl || Boolean(isDownloading);

                    return (
                      <div
                        key={tpl.id}
                        className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs"
                      >
                        {/* Document Icon & Title Block */}
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                            <ClipboardList className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h4 className="text-base sm:text-base font-bold text-foreground leading-snug break-words">
                              {tpl.name}
                            </h4>
                            <p className="text-sm sm:text-sm text-muted-foreground leading-relaxed break-words">
                              {tpl.description || "Reference template"}
                            </p>
                          </div>
                        </div>

                        {/* Actions: View & Download Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={viewDisabled}
                            onClick={() => void openTemplate(rawUrl, tpl.name)}
                            className="h-8 text-sm font-semibold text-primary border-primary/20 hover:bg-primary/5 rounded-lg flex items-center justify-center cursor-pointer shadow-2xs disabled:opacity-50"
                          >
                            {isOpening ? (
                              <>
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Opening…
                              </>
                            ) : (
                              <>
                                <Eye className="mr-1 h-3.5 w-3.5" /> View
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={dlDisabled}
                            onClick={() => void downloadTemplate(rawUrl, tpl.name)}
                            className="h-8 text-sm font-bold rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Downloading…
                              </>
                            ) : (
                              <>
                                <Download className="mr-1 h-3.5 w-3.5" /> Download
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Reusable In-Page Document Preview Modal from Authenticated Portal */}
      <PortalDocumentPreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        previewUrl={previewUrl}
        previewTitle={previewTitle}
        previewCanInline={previewCanInline}
        previewEmptyMessage={previewEmptyMessage}
        hideTopCloseButton={true}
        onDownloadFile={downloadTemplate}
      />
    </div>
  );
}
