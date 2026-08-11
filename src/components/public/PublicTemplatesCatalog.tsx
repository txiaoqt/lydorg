import React, { useMemo, useState } from "react";
import {
  FileText,
  Download,
  Eye,
  Search,
  ChevronDown,
  Filter,
  CheckCircle2,
  FolderArchive,
  ExternalLink,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type FilterId = "all" | "document_submission" | "other";

type PublicTemplatesCatalogProps = {
  compactHeader?: boolean;
  searchTerm?: string;
};

export default function PublicTemplatesCatalog({ compactHeader = false, searchTerm = "" }: PublicTemplatesCatalogProps) {
  const { state } = useLydoConnect();
  const [openingTemplateId, setOpeningTemplateId] = useState<string | null>(null);
  const [downloadingTemplateId, setDownloadingTemplateId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [requiredOpen, setRequiredOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);

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

  const filteredDocTemplates = applySearch(publicDocumentTemplates);
  const filteredOtherTemplates = applySearch(publicOtherTemplates);

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

  return (
    <div className="space-y-6 font-sans">
      {/* Filter Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/60 p-2.5 px-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={cn(
              "rounded-full px-3.5 py-1 text-xs font-semibold transition-all",
              activeFilter === "all"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            All Templates ({publicDocumentTemplates.length + publicOtherTemplates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("document_submission")}
            className={cn(
              "rounded-full px-3.5 py-1 text-xs font-semibold transition-all",
              activeFilter === "document_submission"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            Required Documents ({publicDocumentTemplates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("other")}
            className={cn(
              "rounded-full px-3.5 py-1 text-xs font-semibold transition-all",
              activeFilter === "other"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            Other References ({publicOtherTemplates.length})
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            [...publicDocumentTemplates, ...publicOtherTemplates].forEach((t) => {
              if (t.templateFileUrl) void openTemplate(t.templateFileUrl, t.name);
            });
          }}
          className="h-8 rounded-xl border-border text-xs font-medium gap-1 shrink-0"
        >
          <FolderArchive className="h-3.5 w-3.5 text-primary" /> Download All
        </Button>
      </div>

      {/* Section 1: Required Document Templates Explorer Table */}
      {(activeFilter === "all" || activeFilter === "document_submission") && (
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs space-y-0">
          <div
            onClick={() => setRequiredOpen(!requiredOpen)}
            className="p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !requiredOpen && "-rotate-90")} />
              Document Submission Templates ({filteredDocTemplates.length})
            </h3>
            <span className="text-[11px] text-muted-foreground font-semibold">Mandatory Registration Files</span>
          </div>

          {requiredOpen && (
            <div className="overflow-x-auto">
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
                    filteredDocTemplates.map((tpl) => (
                      <tr key={tpl.id} className="h-16 hover:bg-primary/5 transition-colors cursor-pointer group">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary shrink-0" />
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-foreground truncate max-w-[320px]">{tpl.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[320px]">{tpl.description || "Official template"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Approved Standard
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
                            onClick={() => void openTemplate(tpl.templateFileUrl, tpl.name)}
                            className="h-7 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void downloadTemplate(tpl.templateFileUrl, tpl.name)}
                            className="h-7 text-xs font-bold rounded-lg bg-primary text-primary-foreground"
                          >
                            <Download className="mr-1 h-3.5 w-3.5" /> Download
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Section 2: Other Templates Explorer Table */}
      {(activeFilter === "all" || activeFilter === "other") && (
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs space-y-0">
          <div
            onClick={() => setOtherOpen(!otherOpen)}
            className="p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !otherOpen && "-rotate-90")} />
              Other Reference Templates ({filteredOtherTemplates.length})
            </h3>
            <span className="text-[11px] text-muted-foreground font-semibold">Supplementary Files</span>
          </div>

          {otherOpen && (
            <div className="overflow-x-auto">
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
                    filteredOtherTemplates.map((tpl) => (
                      <tr key={tpl.id} className="h-16 hover:bg-primary/5 transition-colors cursor-pointer group">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-foreground truncate max-w-[320px]">{tpl.name}</p>
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
                            onClick={() => void openTemplate(tpl.templateFileUrl, tpl.name)}
                            className="h-7 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void downloadTemplate(tpl.templateFileUrl, tpl.name)}
                            className="h-7 text-xs font-bold rounded-lg bg-primary text-primary-foreground"
                          >
                            <Download className="mr-1 h-3.5 w-3.5" /> Download
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
