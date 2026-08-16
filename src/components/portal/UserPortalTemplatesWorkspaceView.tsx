import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Download,
  Eye,
  Search,
  ChevronDown,
  Filter,
  FolderArchive,
  Loader2
} from "lucide-react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { formatFullActivityTimestamp } from "@/components/activity/RecentActivityPreview";

export interface UserPortalTemplatesWorkspaceViewProps {
  publicTemplates: Array<any>;
  openPreview?: (fileUrl: string, fileName: string) => void;
  openFile: (url: string, name: string) => void;
  formatShortPortalDate?: (dateStr: string) => string;
}

// Authentic File Format Resolver (PDF, DOCX, XLSX, ZIP, PNG, etc.)
export const getTemplateFileFormat = (fileUrl?: string | null, fileName?: string | null): string => {
  const source = (fileUrl || fileName || "").split("?")[0].split("#")[0];
  if (!source.trim()) return "Unknown";
  const segments = source.split("/");
  const lastSegment = segments[segments.length - 1] || "";
  const parts = lastSegment.split(".");
  if (parts.length < 2) return "PDF";
  const ext = parts.pop()?.toUpperCase().trim() ?? "";
  if (!ext) return "Unknown";
  if (ext === "JPEG") return "JPG";
  return ext;
};

// Authentic File Size Formatter (B, KB, MB)
export const formatFileSize = (bytes?: number | null): string => {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(1).replace(/\.0$/, "");
    return `${kb} KB`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "");
  return `${mb} MB`;
};

// Authentic Timestamp Formatter
export const formatTemplateTimestamp = (timestamp?: string | null): string => {
  if (!timestamp || !timestamp.trim()) {
    return "—";
  }
  const formatted = formatFullActivityTimestamp(timestamp);
  if (!formatted || formatted.toLowerCase().includes("recently")) {
    return "—";
  }
  return formatted;
};

export const UserPortalTemplatesWorkspaceView: React.FC<UserPortalTemplatesWorkspaceViewProps> = ({
  publicTemplates,
  openPreview,
  openFile,
  formatShortPortalDate,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [requiredOpen, setRequiredOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);

  // Loading States for ZIP & Single Downloads
  const [downloadingZipKey, setDownloadingZipKey] = useState<string | null>(null);
  const [downloadingSingleId, setDownloadingSingleId] = useState<string | null>(null);

  // Dynamic Metadata Resolver Map (Resolves Content-Length & Last-Modified from Storage)
  const [resolvedMetadataMap, setResolvedMetadataMap] = useState<
    Record<string, { fileSize?: number; updatedAt?: string }>
  >({});

  // Asynchronously resolve authentic storage metadata for templates missing exact bytes
  useEffect(() => {
    let isMounted = true;

    publicTemplates.forEach((tpl) => {
      if (tpl.fileSize || !tpl.fileUrl) return;

      void resolveSupabaseFileUrl(tpl.fileUrl).then((resolvedUrl) => {
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
  }, [publicTemplates]);

  // Extract authentic unique categories from database templates
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    publicTemplates.forEach((t) => {
      if (t.category?.trim()) cats.add(t.category.trim());
    });
    return Array.from(cats);
  }, [publicTemplates]);

  // Filter templates based on Search Query and Category
  const filteredTemplates = useMemo(() => {
    return publicTemplates.filter((tpl) => {
      const matchesSearch =
        !searchQuery.trim() ||
        tpl.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || tpl.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [publicTemplates, searchQuery, categoryFilter]);

  // Categorized Section Datasets
  const requiredTemplates = useMemo(
    () => filteredTemplates.filter((t) => t.isRequired ?? true),
    [filteredTemplates]
  );

  const otherTemplates = useMemo(
    () => filteredTemplates.filter((t) => !(t.isRequired ?? true)),
    [filteredTemplates]
  );

  // Single ZIP Archive Generation for Section or Download All
  const handleDownloadTemplatesZip = async (
    templatesToZip: Array<any>,
    zipFileName: string,
    downloadKey: string
  ) => {
    if (!templatesToZip || templatesToZip.length === 0) {
      toast({
        title: "No templates to download",
        description: "There are no templates matching your current filter.",
        variant: "destructive",
      });
      return;
    }

    try {
      setDownloadingZipKey(downloadKey);
      toast({
        title: `Preparing ${templatesToZip.length} template${templatesToZip.length > 1 ? "s" : ""}...`,
        description: "Generating ZIP archive for download.",
      });

      const zip = new JSZip();
      let addedCount = 0;

      await Promise.all(
        templatesToZip.map(async (tpl, index) => {
          if (!tpl.fileUrl || tpl.fileUrl.startsWith("#")) return;
          try {
            const resolvedUrl = await resolveSupabaseFileUrl(tpl.fileUrl);
            if (!resolvedUrl) return;

            const response = await fetch(resolvedUrl);
            if (!response.ok) return;

            const blob = await response.blob();
            const urlPath = tpl.fileUrl.split("?")[0];
            let ext = urlPath.split(".").pop() || "pdf";
            if (ext.length > 5 || ext === urlPath) {
              if (resolvedUrl.toLowerCase().includes(".pdf") || blob.type.includes("pdf")) ext = "pdf";
              else if (resolvedUrl.toLowerCase().includes(".docx") || blob.type.includes("word")) ext = "docx";
              else if (resolvedUrl.toLowerCase().includes(".xlsx") || blob.type.includes("sheet")) ext = "xlsx";
              else ext = "pdf";
            }
            const safeName = (tpl.title || `Template-${index + 1}`).replace(/[\\/:*?"<>|]/g, "_");
            const fileName = safeName.endsWith(`.${ext}`) ? safeName : `${safeName}.${ext}`;

            zip.file(fileName, blob);
            addedCount++;
          } catch (err) {
            console.error(`Failed to add template ${tpl.title} to ZIP:`, err);
          }
        })
      );

      if (addedCount === 0) {
        throw new Error("Unable to retrieve any template files for the ZIP archive.");
      }

      toast({
        title: "ZIP ready.",
        description: `Successfully packaged ${addedCount} template file${addedCount > 1 ? "s" : ""}. Download starting now.`,
      });

      const content = await zip.generateAsync({ type: "blob" });
      const blobUrl = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = zipFileName.endsWith(".zip") ? zipFileName : `${zipFileName}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("ZIP creation error:", err);
      toast({
        title: "Download error",
        description: err instanceof Error ? err.message : "Unable to generate ZIP archive right now.",
        variant: "destructive",
      });
    } finally {
      setDownloadingZipKey(null);
    }
  };

  // Authentic Blob-Fetch Direct Download for Individual Template File
  const handleDownloadSingleTemplate = async (tpl: any) => {
    if (!tpl.fileUrl || tpl.fileUrl.startsWith("#")) {
      toast({
        title: "Download unavailable",
        description: "No file is available for download yet.",
        variant: "destructive",
      });
      return;
    }
    try {
      setDownloadingSingleId(tpl.id);
      const resolvedUrl = await resolveSupabaseFileUrl(tpl.fileUrl);
      if (!resolvedUrl) throw new Error("File URL not available");

      const response = await fetch(resolvedUrl);
      if (!response.ok) throw new Error("Fetch failed");

      const blob = await response.blob();
      let targetFileName = (tpl.title || "template-document").trim().replace(/[/\\?%*:|"<>]/g, "-");
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

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = targetFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Single download fallback link click:", err);
      openFile(tpl.fileUrl, tpl.title);
    } finally {
      setDownloadingSingleId(null);
    }
  };

  return (
    <div className="bg-background text-foreground transition-colors duration-200 font-sans max-w-[1440px] mx-auto pt-0 pb-2 sm:py-2">
      {/* ============================================================= */}
      {/* 1. MOBILE-ONLY LAYOUT (block lg:hidden)                        */}
      {/* ============================================================= */}
      <div className="mobile-layout block lg:hidden space-y-4">
        {/* Mobile Hero Header */}
        <div className="bg-gradient-to-r from-card via-blue-50/10 to-slate-50/40 dark:from-card dark:via-blue-950/10 dark:to-slate-900/40 p-4 rounded-2xl border border-border/60 shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-primary">Public Templates</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-muted-foreground">Document Explorer</span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-foreground leading-snug break-words">
            Official Document Templates
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Browse, inspect, and download official downloadable templates required for Pasig City youth organization registration.
          </p>
        </div>

        {/* Mobile Search & Filter Toolbar */}
        <div className="bg-card border border-border/60 p-3 rounded-2xl shadow-xs space-y-2.5">
          {/* Search Input - Full Row */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-3 text-xs rounded-xl bg-background border-border/80 w-full"
            />
          </div>

          {/* Filter Controls Row (Category + ZIP) */}
          <div className="grid grid-cols-2 gap-2">
            {/* Category Dropdown Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-full rounded-xl border-border/80 text-xs font-semibold gap-1.5 justify-between px-2.5 sm:px-3 cursor-pointer shadow-2xs hover:bg-accent text-foreground min-w-0"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate text-left">
                    <Filter className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      {categoryFilter === "all" ? "Category: All" : `Filter: ${categoryFilter}`}
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-70 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-xl bg-card border-border/80 shadow-lg">
                <DropdownMenuItem
                  onClick={() => setCategoryFilter("all")}
                  className={cn(
                    "text-xs font-medium rounded-lg cursor-pointer flex items-center justify-between",
                    categoryFilter === "all" && "bg-primary/10 text-primary font-bold"
                  )}
                >
                  <span>All Categories</span>
                  <span className="text-[10px] text-muted-foreground">({publicTemplates.length})</span>
                </DropdownMenuItem>
                {availableCategories.map((cat) => {
                  const count = publicTemplates.filter((t) => t.category === cat).length;
                  return (
                    <DropdownMenuItem
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        "text-xs font-medium rounded-lg cursor-pointer flex items-center justify-between",
                        categoryFilter === cat && "bg-primary/10 text-primary font-bold"
                      )}
                    >
                      <span className="truncate mr-2">{cat}</span>
                      {count > 0 && <span className="text-[10px] text-muted-foreground">({count})</span>}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Download ZIP Button (Global / Filtered) */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={downloadingZipKey === "mobile-toolbar-zip" || filteredTemplates.length === 0}
              onClick={() => {
                const name = categoryFilter !== "all"
                  ? `${categoryFilter.replace(/\s+/g, "-")}-Templates.zip`
                  : "Official-Templates.zip";
                void handleDownloadTemplatesZip(filteredTemplates, name, "mobile-toolbar-zip");
              }}
              className="h-9 w-full rounded-xl border-border/80 text-xs font-semibold gap-1.5 justify-center px-2.5 sm:px-3 cursor-pointer shadow-2xs hover:bg-accent text-foreground min-w-0"
            >
              {downloadingZipKey === "mobile-toolbar-zip" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                  <span className="truncate">Preparing ZIP...</span>
                </>
              ) : (
                <>
                  <FolderArchive className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">Download ZIP ({filteredTemplates.length})</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Section 1: Required Templates (Mobile) */}
        {requiredTemplates.length > 0 && (
          <div className="space-y-2.5">
            {/* Compact Integrated Section Header Card */}
            <div className="bg-card border border-border/60 p-3 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between gap-2">
                {/* Left: Title & Subtitle clickable area for collapse/expand */}
                <div
                  onClick={() => setRequiredOpen(!requiredOpen)}
                  className="min-w-0 flex-1 cursor-pointer select-none space-y-0.5 pr-1"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground truncate">
                    Required Registration Templates ({requiredTemplates.length})
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-semibold block">
                    Mandatory Submission
                  </span>
                </div>

                {/* Right: Section ZIP Button + Chevron Toggle */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={downloadingZipKey === "mobile-required-section"}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDownloadTemplatesZip(
                        requiredTemplates,
                        "Required-Registration-Templates.zip",
                        "mobile-required-section"
                      );
                    }}
                    className="h-7 px-2.5 text-[11px] font-bold rounded-xl border-border/80 gap-1.5 cursor-pointer shadow-2xs hover:bg-accent text-foreground shrink-0"
                  >
                    {downloadingZipKey === "mobile-required-section" ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                        <span className="hidden xs:inline">Preparing...</span>
                      </>
                    ) : (
                      <>
                        <FolderArchive className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>ZIP Section ({requiredTemplates.length})</span>
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRequiredOpen(!requiredOpen);
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-accent/60 transition-colors shrink-0"
                    aria-label="Toggle required templates section"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        !requiredOpen && "-rotate-90"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Template Cards List */}
            {requiredOpen && (
              <div className="space-y-3">
                {requiredTemplates.map((tpl) => {
                  const resolvedMeta = resolvedMetadataMap[tpl.id];
                  const rawSizeBytes = tpl.fileSize ?? resolvedMeta?.fileSize ?? null;
                  const rawTimestamp = tpl.updatedAt ?? resolvedMeta?.updatedAt ?? null;
                  const fileSizeLabel = formatFileSize(rawSizeBytes);
                  const formattedTime = formatTemplateTimestamp(rawTimestamp);
                  const fileFormat = getTemplateFileFormat(tpl.fileUrl, tpl.title);
                  const isDownloading = downloadingSingleId === tpl.id;

                  return (
                    <Card key={tpl.id} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-xs hover:border-primary/40 transition-all flex flex-col">
                      {/* Top Row: Icon + Title */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-bold text-foreground leading-snug break-words" title={tpl.title}>
                            {tpl.title}
                          </p>
                          {/* Metadata Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-muted-foreground uppercase">
                              {fileFormat}
                            </span>
                            <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                              Required
                            </span>
                            {tpl.category && (
                              <span className="text-[10px] font-medium bg-muted/60 border border-border/50 px-2 py-0.5 rounded-md text-muted-foreground truncate max-w-[140px]">
                                {tpl.category}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {fileSizeLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed break-words">
                        {tpl.description || "Official registration template"}
                      </p>

                      {/* Updated Timestamp & Actions */}
                      <div className="space-y-2.5 pt-1.5 border-t border-border/40">
                        <div className="text-[10px] text-muted-foreground/80 font-medium">
                          Updated: {formattedTime}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (openPreview) {
                                void openPreview(tpl.fileUrl, tpl.title);
                              } else {
                                void openFile(tpl.fileUrl, tpl.title);
                              }
                            }}
                            className="h-9 px-3 rounded-xl border border-border/80 text-xs font-semibold text-foreground hover:bg-accent gap-1.5 flex items-center justify-center cursor-pointer shadow-xs transition-all"
                          >
                            <Eye className="h-3.5 w-3.5 text-primary" /> View
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            disabled={isDownloading}
                            onClick={() => void handleDownloadSingleTemplate(tpl)}
                            className="h-9 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 flex items-center justify-center cursor-pointer shadow-xs transition-all"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span className="truncate">Downloading...</span>
                              </>
                            ) : (
                              <>
                                <Download className="h-3.5 w-3.5" />
                                <span className="truncate">Download</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Section 2: Optional & Reference Templates (Mobile) */}
        {otherTemplates.length > 0 && (
          <div className="space-y-2.5">
            {/* Compact Integrated Section Header Card */}
            <div className="bg-card border border-border/60 p-3 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between gap-2">
                {/* Left: Title & Subtitle clickable area for collapse/expand */}
                <div
                  onClick={() => setOtherOpen(!otherOpen)}
                  className="min-w-0 flex-1 cursor-pointer select-none space-y-0.5 pr-1"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground truncate">
                    Optional & Reference Templates ({otherTemplates.length})
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-semibold block">
                    Supplementary
                  </span>
                </div>

                {/* Right: Section ZIP Button + Chevron Toggle */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={downloadingZipKey === "mobile-other-section"}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDownloadTemplatesZip(
                        otherTemplates,
                        "Optional-Reference-Templates.zip",
                        "mobile-other-section"
                      );
                    }}
                    className="h-7 px-2.5 text-[11px] font-bold rounded-xl border-border/80 gap-1.5 cursor-pointer shadow-2xs hover:bg-accent text-foreground shrink-0"
                  >
                    {downloadingZipKey === "mobile-other-section" ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                        <span className="hidden xs:inline">Preparing...</span>
                      </>
                    ) : (
                      <>
                        <FolderArchive className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>ZIP Section ({otherTemplates.length})</span>
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOtherOpen(!otherOpen);
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-accent/60 transition-colors shrink-0"
                    aria-label="Toggle optional templates section"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        !otherOpen && "-rotate-90"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Template Cards List */}
            {otherOpen && (
              <div className="space-y-3">
                {otherTemplates.map((tpl) => {
                  const resolvedMeta = resolvedMetadataMap[tpl.id];
                  const rawSizeBytes = tpl.fileSize ?? resolvedMeta?.fileSize ?? null;
                  const rawTimestamp = tpl.updatedAt ?? resolvedMeta?.updatedAt ?? null;
                  const fileSizeLabel = formatFileSize(rawSizeBytes);
                  const formattedTime = formatTemplateTimestamp(rawTimestamp);
                  const fileFormat = getTemplateFileFormat(tpl.fileUrl, tpl.title);
                  const isDownloading = downloadingSingleId === tpl.id;

                  return (
                    <Card key={tpl.id} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-xs hover:border-primary/40 transition-all flex flex-col">
                      {/* Top Row: Icon + Title */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-bold text-foreground leading-snug break-words" title={tpl.title}>
                            {tpl.title}
                          </p>
                          {/* Metadata Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-muted-foreground uppercase">
                              {fileFormat}
                            </span>
                            <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                              Optional
                            </span>
                            {tpl.category && (
                              <span className="text-[10px] font-medium bg-muted/60 border border-border/50 px-2 py-0.5 rounded-md text-muted-foreground truncate max-w-[140px]">
                                {tpl.category}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {fileSizeLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed break-words">
                        {tpl.description || "Reference template"}
                      </p>

                      {/* Updated Timestamp & Actions */}
                      <div className="space-y-2.5 pt-1.5 border-t border-border/40">
                        <div className="text-[10px] text-muted-foreground/80 font-medium">
                          Updated: {formattedTime}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (openPreview) {
                                void openPreview(tpl.fileUrl, tpl.title);
                              } else {
                                void openFile(tpl.fileUrl, tpl.title);
                              }
                            }}
                            className="h-9 px-3 rounded-xl border border-border/80 text-xs font-semibold text-foreground hover:bg-accent gap-1.5 flex items-center justify-center cursor-pointer shadow-xs transition-all"
                          >
                            <Eye className="h-3.5 w-3.5 text-primary" /> View
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            disabled={isDownloading}
                            onClick={() => void handleDownloadSingleTemplate(tpl)}
                            className="h-9 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 flex items-center justify-center cursor-pointer shadow-xs transition-all"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span className="truncate">Downloading...</span>
                              </>
                            ) : (
                              <>
                                <Download className="h-3.5 w-3.5" />
                                <span className="truncate">Download</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mobile Empty State */}
        {filteredTemplates.length === 0 && (
          <Card className="rounded-2xl border border-border/60 bg-card p-8 text-center space-y-2 shadow-xs">
            <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-bold text-foreground">No templates found</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Try adjusting your search query or selected category filter.
            </p>
          </Card>
        )}
      </div>

      {/* ============================================================= */}
      {/* 2. DESKTOP-ONLY LAYOUT (hidden lg:block - EXACT SOURCE OF TRUTH) */}
      {/* ============================================================= */}
      <div className="desktop-layout hidden lg:block space-y-6">
        {/* Clean Hero Workspace Header */}
        <div className="bg-gradient-to-r from-card via-blue-50/10 to-slate-50/40 dark:from-card dark:via-blue-950/10 dark:to-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">Public Templates</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="text-xs text-muted-foreground">Document Explorer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Official Document Templates
          </h1>
          <p className="text-sm text-muted-foreground max-w-[720px]">
            Browse, inspect, and download official downloadable templates required for Pasig City youth organization registration.
          </p>
        </div>

        {/* Unified Search & Category Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/60 p-2.5 px-3 rounded-2xl shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search templates by title, description, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs rounded-xl bg-background border-border/80"
            />
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl border-border text-xs font-medium gap-1 cursor-pointer">
                  <Filter className="h-3.5 w-3.5" />
                  Category: {categoryFilter === "all" ? "All" : categoryFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 p-2 rounded-xl bg-card border-border/80">
                <DropdownMenuItem onClick={() => setCategoryFilter("all")} className="text-xs font-medium cursor-pointer">
                  All Categories ({publicTemplates.length})
                </DropdownMenuItem>
                {availableCategories.map((cat) => (
                  <DropdownMenuItem key={cat} onClick={() => setCategoryFilter(cat)} className="text-xs font-medium cursor-pointer">
                    {cat}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={downloadingZipKey === "toolbar-zip"}
              onClick={() => {
                const name = categoryFilter !== "all"
                  ? `${categoryFilter.replace(/\s+/g, "-")}-Templates.zip`
                  : "Official-Templates.zip";
                void handleDownloadTemplatesZip(filteredTemplates, name, "toolbar-zip");
              }}
              className="h-8 rounded-xl border-border text-xs font-medium gap-1.5 cursor-pointer"
            >
              {downloadingZipKey === "toolbar-zip" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing ZIP...
                </>
              ) : (
                <>
                  <FolderArchive className="h-3.5 w-3.5 text-primary" /> Download ZIP ({filteredTemplates.length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Section 1: Required Templates Data Table (Rendered ONLY if items exist) */}
        {requiredTemplates.length > 0 && (
          <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs space-y-0">
            <div
              onClick={() => setRequiredOpen(!requiredOpen)}
              className="p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !requiredOpen && "-rotate-90")} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Required Registration Templates ({requiredTemplates.length})
                </h3>
              </div>

              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloadingZipKey === "required-section"}
                  onClick={() => void handleDownloadTemplatesZip(requiredTemplates, "Required-Registration-Templates.zip", "required-section")}
                  className="h-7 text-[11px] font-bold rounded-lg border-border gap-1 cursor-pointer"
                >
                  {downloadingZipKey === "required-section" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Preparing...
                    </>
                  ) : (
                    <>
                      <FolderArchive className="h-3 w-3 text-primary" /> ZIP Section ({requiredTemplates.length})
                    </>
                  )}
                </Button>
                <span className="text-[11px] text-muted-foreground font-semibold">Mandatory Submission</span>
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
                    {requiredTemplates.map((tpl) => {
                      const resolvedMeta = resolvedMetadataMap[tpl.id];
                      const rawSizeBytes = tpl.fileSize ?? resolvedMeta?.fileSize ?? null;
                      const rawTimestamp = tpl.updatedAt ?? resolvedMeta?.updatedAt ?? null;

                      const fileSizeLabel = formatFileSize(rawSizeBytes);
                      const formattedTime = formatTemplateTimestamp(rawTimestamp);
                      const fileFormat = getTemplateFileFormat(tpl.fileUrl, tpl.title);

                      return (
                        <tr key={tpl.id} className="h-16 hover:bg-primary/5 transition-colors cursor-pointer group">
                          {/* Column 1: Document */}
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-primary shrink-0" />
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-xs font-bold text-foreground truncate max-w-[280px]" title={tpl.title}>
                                  {tpl.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate max-w-[280px]" title={tpl.description}>
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
                            {tpl.category || "Registration"}
                          </td>

                          {/* Column 4: Authentic File Size */}
                          <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                            {fileSizeLabel}
                          </td>

                          {/* Column 5: Authentic Timestamp */}
                          <td className="py-3 px-4 text-xs text-muted-foreground font-medium">
                            {formattedTime}
                          </td>

                          {/* Column 6: Actions */}
                          <td className="py-3 px-5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (openPreview) {
                                  void openPreview(tpl.fileUrl, tpl.title);
                                } else {
                                  void openFile(tpl.fileUrl, tpl.title);
                                }
                              }}
                              className="h-7 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" /> View
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={downloadingSingleId === tpl.id}
                              onClick={() => void handleDownloadSingleTemplate(tpl)}
                              className="h-7 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer gap-1"
                            >
                              {downloadingSingleId === tpl.id ? (
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

        {/* Section 2: Other Templates Data Table (Rendered ONLY if items exist) */}
        {otherTemplates.length > 0 && (
          <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs space-y-0">
            <div
              onClick={() => setOtherOpen(!otherOpen)}
              className="p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !otherOpen && "-rotate-90")} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Optional & Reference Templates ({otherTemplates.length})
                </h3>
              </div>

              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloadingZipKey === "other-section"}
                  onClick={() => void handleDownloadTemplatesZip(otherTemplates, "Optional-Reference-Templates.zip", "other-section")}
                  className="h-7 text-[11px] font-bold rounded-lg border-border gap-1 cursor-pointer"
                >
                  {downloadingZipKey === "other-section" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Preparing...
                    </>
                  ) : (
                    <>
                      <FolderArchive className="h-3 w-3 text-primary" /> ZIP Section ({otherTemplates.length})
                    </>
                  )}
                </Button>
                <span className="text-[11px] text-muted-foreground font-semibold">Supplementary</span>
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
                    {otherTemplates.map((tpl) => {
                      const resolvedMeta = resolvedMetadataMap[tpl.id];
                      const rawSizeBytes = tpl.fileSize ?? resolvedMeta?.fileSize ?? null;
                      const rawTimestamp = tpl.updatedAt ?? resolvedMeta?.updatedAt ?? null;

                      const fileSizeLabel = formatFileSize(rawSizeBytes);
                      const formattedTime = formatTemplateTimestamp(rawTimestamp);
                      const fileFormat = getTemplateFileFormat(tpl.fileUrl, tpl.title);

                      return (
                        <tr key={tpl.id} className="h-16 hover:bg-primary/5 transition-colors cursor-pointer group">
                          {/* Column 1: Document */}
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-primary shrink-0" />
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-xs font-bold text-foreground truncate max-w-[280px]" title={tpl.title}>
                                  {tpl.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate max-w-[280px]" title={tpl.description}>
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
                            {tpl.category || "Reference"}
                          </td>

                          {/* Column 4: Authentic File Size */}
                          <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                            {fileSizeLabel}
                          </td>

                          {/* Column 5: Authentic Timestamp */}
                          <td className="py-3 px-4 text-xs text-muted-foreground font-medium">
                            {formattedTime}
                          </td>

                          {/* Column 6: Actions */}
                          <td className="py-3 px-5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (openPreview) {
                                  void openPreview(tpl.fileUrl, tpl.title);
                                } else {
                                  void openFile(tpl.fileUrl, tpl.title);
                                }
                              }}
                              className="h-7 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" /> View
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={downloadingSingleId === tpl.id}
                              onClick={() => void handleDownloadSingleTemplate(tpl)}
                              className="h-7 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer gap-1"
                            >
                              {downloadingSingleId === tpl.id ? (
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

        {/* Clean Single Empty State when 0 templates match filter */}
        {filteredTemplates.length === 0 && (
          <Card className="rounded-2xl border border-border/60 bg-card p-12 text-center space-y-2 shadow-xs">
            <FileText className="h-10 w-10 text-muted-foreground/60 mx-auto" />
            <p className="text-sm font-bold text-foreground">No templates found</p>
            <p className="text-xs text-muted-foreground">
              No official templates match your search query or selected category filter.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
