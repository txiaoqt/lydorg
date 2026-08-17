import React, { useMemo, useState, useEffect } from "react";
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
  ClipboardList,
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
import {
  getTemplateFileFormat,
  formatFileSize,
  formatTemplateTimestamp,
} from "@/components/portal/UserPortalTemplatesWorkspaceView";
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

  // Dynamic Metadata Resolver Map (Resolves Content-Length & Last-Modified from Storage)
  const [resolvedMetadataMap, setResolvedMetadataMap] = useState<
    Record<string, { fileSize?: number; updatedAt?: string }>
  >({});

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

  // Asynchronously resolve authentic storage metadata for templates missing exact bytes
  useEffect(() => {
    let isMounted = true;
    const allTemplates = [...publicDocumentTemplates, ...publicOtherTemplates];

    allTemplates.forEach((tpl) => {
      const rawUrl = tpl.templateFileUrl || tpl.templateUrl;
      if (tpl.fileSize || !rawUrl || rawUrl.startsWith("#")) return;

      void resolveSupabaseFileUrl(rawUrl).then((resolvedUrl) => {
        if (!resolvedUrl || !isMounted) return;

        fetch(resolvedUrl, { method: "HEAD" })
          .then((res) => {
            if (!isMounted) return;
            const contentLength = res.headers.get("content-length");
            const lastModified = res.headers.get("last-modified");

            if (contentLength || lastModified) {
              setResolvedMetadataMap((prev) => ({
                ...prev,
                [tpl.id]: {
                  fileSize: contentLength ? parseInt(contentLength, 10) : prev[tpl.id]?.fileSize,
                  updatedAt: lastModified ? new Date(lastModified).toISOString() : prev[tpl.id]?.updatedAt,
                },
              }));
            }
          })
          .catch(() => {
            // Silently swallow CORS or HEAD failures
          });
      });
    });

    return () => {
      isMounted = false;
    };
  }, [publicDocumentTemplates, publicOtherTemplates]);

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
    if (activeFilter === "document_submission") return filteredDocTemplates.length > 0 ? filteredDocTemplates : publicDocumentTemplates;
    if (activeFilter === "other") return filteredOtherTemplates.length > 0 ? filteredOtherTemplates : publicOtherTemplates;
    const combined = [...filteredDocTemplates, ...filteredOtherTemplates];
    return combined.length > 0 ? combined : [...publicDocumentTemplates, ...publicOtherTemplates];
  }, [activeFilter, filteredDocTemplates, filteredOtherTemplates, publicDocumentTemplates, publicOtherTemplates]);

  const categoryDownloadableTemplates = useMemo(() => {
    return categoryTemplates.filter((t) => {
      const url = t.templateFileUrl || t.templateUrl;
      return Boolean(url && url.trim() && !url.startsWith("#"));
    });
  }, [categoryTemplates]);

  const categoryDownloadableCount = categoryDownloadableTemplates.length;
  const [downloadingZipKey, setDownloadingZipKey] = useState<string | null>(null);

  const getZipFileName = (filter: FilterId) => {
    if (filter === "document_submission") return "Y-TRACE-Templates-Required-Documents.zip";
    if (filter === "other") return "Y-TRACE-Templates-Reference-Guides.zip";
    return "Y-TRACE-Templates-All.zip";
  };

  const downloadSectionZip = async (
    templatesToZip: typeof state.templates,
    zipFileName: string,
    downloadKey: string
  ) => {
    if (downloadingZipKey) return;
    const downloadable = templatesToZip.filter((t) => {
      const url = t.templateFileUrl || t.templateUrl;
      return Boolean(url && url.trim() && !url.startsWith("#"));
    });

    if (downloadable.length === 0) {
      toast({
        title: "No downloadable templates",
        description: "There are no downloadable template files in this section.",
      });
      return;
    }

    try {
      setDownloadingZipKey(downloadKey);
      toast({
        title: `Preparing ${downloadable.length} template${downloadable.length > 1 ? "s" : ""}...`,
        description: "Generating ZIP archive for download.",
      });

      const zip = new JSZip();
      let addedCount = 0;

      await Promise.all(
        downloadable.map(async (tpl, index) => {
          const rawUrl = tpl.templateFileUrl || tpl.templateUrl;
          if (!rawUrl || rawUrl.startsWith("#")) return;

          try {
            const resolvedUrl = await resolveSupabaseFileUrl(rawUrl);
            if (!resolvedUrl) return;

            const response = await fetch(resolvedUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();

            let fileName = (tpl.name || `Template-${index + 1}`).trim().replace(/[/\\?%*:|"<>]/g, "-");
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

      toast({
        title: "ZIP ready",
        description: `Successfully packaged ${addedCount} template file${addedCount > 1 ? "s" : ""}. Download starting now.`,
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = zipUrl;
      a.download = zipFileName.endsWith(".zip") ? zipFileName : `${zipFileName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);
    } catch (error) {
      toast({
        title: "ZIP Download failed",
        description: error instanceof Error ? error.message : "An error occurred while generating the ZIP archive.",
        variant: "destructive",
      });
    } finally {
      setDownloadingZipKey(null);
    }
  };

  const downloadCategoryZip = async () => {
    await downloadSectionZip(categoryTemplates, getZipFileName(activeFilter), "toolbar-zip");
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
      {/* ============================================================= */}
      {/* 1. MOBILE-ONLY LAYOUT (block lg:hidden — PRESERVED 100%)       */}
      {/* ============================================================= */}
      <div className="mobile-layout block lg:hidden space-y-4">
        {/* Mobile Unified Toolbar: Single Search + [Category: All] [Download ZIP] */}
        <div className="flex flex-col gap-2.5 bg-card border border-border/60 p-2.5 px-3 rounded-2xl shadow-xs">
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
              disabled={Boolean(downloadingZipKey) || categoryDownloadableCount === 0}
              onClick={downloadCategoryZip}
              className="h-8 flex-1 rounded-xl border-border/80 bg-background text-sm font-semibold gap-1.5 justify-center shadow-2xs cursor-pointer truncate text-primary hover:text-primary hover:bg-primary/5 disabled:opacity-50"
            >
              {downloadingZipKey === "toolbar-zip" ? (
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

        {/* Section 1: Required Document Templates (Mobile Cards) */}
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
              <div className="p-3 space-y-3">
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
            )}
          </Card>
        )}

        {/* Section 2: Other Reference Templates (Mobile Cards) */}
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
              <div className="p-3 space-y-3">
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
            )}
          </Card>
        )}
      </div>

      {/* ============================================================= */}
      {/* 2. DESKTOP-ONLY LAYOUT (hidden lg:block — PORTAL STRUCTURE)   */}
      {/* ============================================================= */}
      <div className="desktop-layout hidden lg:block space-y-6">
        {/* Unified Search & Category Toolbar */}
        <div className="flex items-center gap-3 bg-card border border-border/60 p-2.5 px-3.5 rounded-2xl shadow-xs">
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

          {/* Category Filter & Download ZIP on the Right (compact content-width) */}
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 rounded-xl border-border/80 bg-background text-sm font-semibold gap-2 px-3.5 shadow-2xs cursor-pointer text-primary hover:text-primary hover:bg-primary/5"
                >
                  <Filter className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Category: {activeFilter === "all"
                    ? "All"
                    : activeFilter === "document_submission"
                    ? "Required"
                    : "References"}</span>
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

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={Boolean(downloadingZipKey) || categoryDownloadableCount === 0}
              onClick={downloadCategoryZip}
              className="h-9 shrink-0 rounded-xl border-border/80 bg-background text-sm font-semibold gap-1.5 px-3.5 shadow-2xs cursor-pointer text-primary hover:text-primary hover:bg-primary/5 disabled:opacity-50"
            >
              {downloadingZipKey === "toolbar-zip" ? (
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
        </div>

        {/* Section 1: Required Document Templates Data Table */}
        {(activeFilter === "all" || activeFilter === "document_submission") && filteredDocTemplates.length > 0 && (
          <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs space-y-0">
            <div
              onClick={() => setRequiredOpen(!requiredOpen)}
              className="p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    !requiredOpen && "-rotate-90"
                  )}
                />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Document Submission Templates ({filteredDocTemplates.length})
                </h3>
              </div>

              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloadingZipKey === "doc-section"}
                  onClick={() =>
                    void downloadSectionZip(
                      filteredDocTemplates,
                      "Y-TRACE-Templates-Required-Documents.zip",
                      "doc-section"
                    )
                  }
                  className="h-7 text-[11px] font-bold rounded-lg border-border gap-1 cursor-pointer disabled:opacity-50"
                >
                  {downloadingZipKey === "doc-section" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Preparing...
                    </>
                  ) : (
                    <>
                      <FolderArchive className="h-3 w-3 text-primary" /> ZIP Section ({filteredDocTemplates.length})
                    </>
                  )}
                </Button>
                <span className="text-[11px] text-muted-foreground font-semibold">Mandatory Registration Files</span>
              </div>
            </div>

            {requiredOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/10 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-5">Document</th>
                      <th className="py-3 px-4 text-center">Format</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">File Size</th>
                      <th className="py-3 px-4">Updated</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredDocTemplates.map((tpl) => {
                      const rawUrl = tpl.templateFileUrl || tpl.templateUrl;
                      const isOpening = openingTemplateId === tpl.name;
                      const isDownloading = downloadingTemplateId === tpl.name;
                      const viewDisabled = !rawUrl || Boolean(isOpening);
                      const dlDisabled = !rawUrl || Boolean(isDownloading);

                      const resolvedMeta = resolvedMetadataMap[tpl.id];
                      const rawSizeBytes = tpl.fileSize ?? (tpl as any).fileSizeBytes ?? resolvedMeta?.fileSize ?? null;
                      const rawTimestamp = tpl.updatedAt ?? resolvedMeta?.updatedAt ?? null;

                      const fileSizeLabel = formatFileSize(rawSizeBytes);
                      const formattedTime = formatTemplateTimestamp(rawTimestamp);
                      const fileFormat = getTemplateFileFormat(rawUrl, tpl.name);

                      return (
                        <tr
                          key={tpl.id}
                          className="h-16 hover:bg-primary/5 transition-colors cursor-pointer group"
                        >
                          {/* Column 1: Document */}
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-primary shrink-0" />
                              <div className="space-y-0.5 min-w-0">
                                <p
                                  className="text-xs font-bold text-foreground truncate max-w-[280px]"
                                  title={tpl.name}
                                >
                                  {tpl.name}
                                </p>
                                <p
                                  className="text-[11px] text-muted-foreground truncate max-w-[280px]"
                                  title={tpl.description || "Official registration template"}
                                >
                                  {tpl.description || "Official registration template"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Format (Center-aligned simple text) */}
                          <td className="py-3 px-4 text-center text-xs font-mono font-bold text-muted-foreground">
                            {fileFormat}
                          </td>

                          {/* Column 3: Category */}
                          <td className="py-3 px-4 text-xs font-semibold text-muted-foreground">
                            {(tpl as any).templateCategory || "Registration Form"}
                          </td>

                          {/* Column 4: File Size */}
                          <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                            {fileSizeLabel}
                          </td>

                          {/* Column 5: Updated */}
                          <td className="py-3 px-4 text-xs text-muted-foreground font-medium">
                            {formattedTime}
                          </td>

                          {/* Column 6: Actions */}
                          <td
                            className="py-3 px-5 text-right space-x-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={viewDisabled}
                              onClick={() => void openTemplate(rawUrl, tpl.name)}
                              className="h-7 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg cursor-pointer disabled:opacity-50"
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
                              className="h-7 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer gap-1 disabled:opacity-50"
                            >
                              {isDownloading ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" /> Downloading...
                                </>
                              ) : (
                                <>
                                  <Download className="h-3.5 w-3.5" /> Download
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Section 2: Other Reference Templates Data Table */}
        {(activeFilter === "all" || activeFilter === "other") && filteredOtherTemplates.length > 0 && (
          <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs space-y-0">
            <div
              onClick={() => setOtherOpen(!otherOpen)}
              className="p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    !otherOpen && "-rotate-90"
                  )}
                />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Other Reference Templates ({filteredOtherTemplates.length})
                </h3>
              </div>

              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloadingZipKey === "other-section"}
                  onClick={() =>
                    void downloadSectionZip(
                      filteredOtherTemplates,
                      "Y-TRACE-Templates-Reference-Guides.zip",
                      "other-section"
                    )
                  }
                  className="h-7 text-[11px] font-bold rounded-lg border-border gap-1 cursor-pointer disabled:opacity-50"
                >
                  {downloadingZipKey === "other-section" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Preparing...
                    </>
                  ) : (
                    <>
                      <FolderArchive className="h-3 w-3 text-primary" /> ZIP Section ({filteredOtherTemplates.length})
                    </>
                  )}
                </Button>
                <span className="text-[11px] text-muted-foreground font-semibold">Supplementary Files</span>
              </div>
            </div>

            {otherOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/10 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-5">Document</th>
                      <th className="py-3 px-4 text-center">Format</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">File Size</th>
                      <th className="py-3 px-4">Updated</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredOtherTemplates.map((tpl) => {
                      const rawUrl = tpl.templateFileUrl || tpl.templateUrl;
                      const isOpening = openingTemplateId === tpl.name;
                      const isDownloading = downloadingTemplateId === tpl.name;
                      const viewDisabled = !rawUrl || Boolean(isOpening);
                      const dlDisabled = !rawUrl || Boolean(isDownloading);

                      const resolvedMeta = resolvedMetadataMap[tpl.id];
                      const rawSizeBytes = tpl.fileSize ?? (tpl as any).fileSizeBytes ?? resolvedMeta?.fileSize ?? null;
                      const rawTimestamp = tpl.updatedAt ?? resolvedMeta?.updatedAt ?? null;

                      const fileSizeLabel = formatFileSize(rawSizeBytes);
                      const formattedTime = formatTemplateTimestamp(rawTimestamp);
                      const fileFormat = getTemplateFileFormat(rawUrl, tpl.name);

                      return (
                        <tr
                          key={tpl.id}
                          className="h-16 hover:bg-primary/5 transition-colors cursor-pointer group"
                        >
                          {/* Column 1: Document */}
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                              <div className="space-y-0.5 min-w-0">
                                <p
                                  className="text-xs font-bold text-foreground truncate max-w-[280px]"
                                  title={tpl.name}
                                >
                                  {tpl.name}
                                </p>
                                <p
                                  className="text-[11px] text-muted-foreground truncate max-w-[280px]"
                                  title={tpl.description || "Reference template"}
                                >
                                  {tpl.description || "Reference template"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Format (Center-aligned simple text) */}
                          <td className="py-3 px-4 text-center text-xs font-mono font-bold text-muted-foreground">
                            {fileFormat}
                          </td>

                          {/* Column 3: Category */}
                          <td className="py-3 px-4 text-xs font-semibold text-muted-foreground">
                            {(tpl as any).templateCategory || "Reference Guide"}
                          </td>

                          {/* Column 4: File Size */}
                          <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                            {fileSizeLabel}
                          </td>

                          {/* Column 5: Updated */}
                          <td className="py-3 px-4 text-xs text-muted-foreground font-medium">
                            {formattedTime}
                          </td>

                          {/* Column 6: Actions */}
                          <td
                            className="py-3 px-5 text-right space-x-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={viewDisabled}
                              onClick={() => void openTemplate(rawUrl, tpl.name)}
                              className="h-7 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg cursor-pointer disabled:opacity-50"
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
                              className="h-7 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer gap-1 disabled:opacity-50"
                            >
                              {isDownloading ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" /> Downloading...
                                </>
                              ) : (
                                <>
                                  <Download className="h-3.5 w-3.5" /> Download
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Single Empty State when 0 templates match filter */}
        {filteredDocTemplates.length === 0 && filteredOtherTemplates.length === 0 && (
          <Card className="rounded-2xl border border-border/60 bg-card p-12 text-center space-y-2 shadow-xs">
            <FileText className="h-10 w-10 text-muted-foreground/60 mx-auto" />
            <p className="text-sm font-bold text-foreground">No templates found</p>
            <p className="text-xs text-muted-foreground">
              No official templates match your search query or selected category filter.
            </p>
          </Card>
        )}
      </div>

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
