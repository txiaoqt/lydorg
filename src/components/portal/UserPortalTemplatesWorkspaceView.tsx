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
    <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-6 max-w-[1440px] mx-auto py-2">
      {/* Clean Hero Workspace Header */}
      <div className="bg-gradient-to-r from-card via-blue-50/10 to-slate-50/40 dark:from-card dark:via-blue-950/10 dark:to-slate-900/40 p-6 sm:p-7 rounded-2xl border border-border/60 shadow-xs space-y-1.5">
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
            <>
              <div className="desktop-table">
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
              </div>
              <div className="mobile-cards p-4 space-y-3">
                {requiredTemplates.map((tpl) => {
                  const resolvedMeta = resolvedMetadataMap[tpl.id];
                  const rawSizeBytes = tpl.fileSize ?? resolvedMeta?.fileSize ?? null;
                  const rawTimestamp = tpl.updatedAt ?? resolvedMeta?.updatedAt ?? null;
                  const fileSizeLabel = formatFileSize(rawSizeBytes);
                  const formattedTime = formatTemplateTimestamp(rawTimestamp);
                  const fileFormat = getTemplateFileFormat(tpl.fileUrl, tpl.title);

                  return (
                    <div key={tpl.id} className="rounded-2xl border border-border/60 bg-card p-4 space-y-2.5 shadow-xs flex flex-col">
                      <div className="flex items-start gap-3">
                        <FileText className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-bold text-foreground line-clamp-2">
                            {tpl.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{fileFormat}</span>
                            <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">Required</span>
                            {tpl.category && <span className="text-[10px] font-medium bg-muted/50 border border-border px-1.5 py-0.5 rounded">{tpl.category}</span>}
                            <span className="text-[10px] text-muted-foreground">{fileSizeLabel}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {tpl.description || "Official registration template"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground font-medium">Updated: {formattedTime}</span>
                        <div className="flex gap-2">
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
                            className="h-8 px-3 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={downloadingSingleId === tpl.id}
                            onClick={() => void handleDownloadSingleTemplate(tpl)}
                            className="h-8 px-3 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer gap-1"
                          >
                            {downloadingSingleId === tpl.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
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
            <>
              <div className="desktop-table">
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
              </div>
              <div className="mobile-cards p-4 space-y-3">
                {otherTemplates.map((tpl) => {
                  const resolvedMeta = resolvedMetadataMap[tpl.id];
                  const rawSizeBytes = tpl.fileSize ?? resolvedMeta?.fileSize ?? null;
                  const rawTimestamp = tpl.updatedAt ?? resolvedMeta?.updatedAt ?? null;
                  const fileSizeLabel = formatFileSize(rawSizeBytes);
                  const formattedTime = formatTemplateTimestamp(rawTimestamp);
                  const fileFormat = getTemplateFileFormat(tpl.fileUrl, tpl.title);

                  return (
                    <div key={tpl.id} className="rounded-2xl border border-border/60 bg-card p-4 space-y-2.5 shadow-xs flex flex-col">
                      <div className="flex items-start gap-3">
                        <FileText className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-bold text-foreground line-clamp-2">
                            {tpl.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{fileFormat}</span>
                            {tpl.category && <span className="text-[10px] font-medium bg-muted/50 border border-border px-1.5 py-0.5 rounded">{tpl.category}</span>}
                            <span className="text-[10px] text-muted-foreground">{fileSizeLabel}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {tpl.description || "Reference template"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground font-medium">Updated: {formattedTime}</span>
                        <div className="flex gap-2">
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
                            className="h-8 px-3 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={downloadingSingleId === tpl.id}
                            onClick={() => void handleDownloadSingleTemplate(tpl)}
                            className="h-8 px-3 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer gap-1"
                          >
                            {downloadingSingleId === tpl.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
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
  );
};
