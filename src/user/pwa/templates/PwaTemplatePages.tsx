import { useMemo, useState } from "react";
import { Download, Eye, File, FileArchive, FileSpreadsheet, FileText, Search } from "lucide-react";
import JSZip from "jszip";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import type { TemplateRecord } from "@/lib/lydo-connect-data";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { requestPwaDocumentPreview } from "@/lib/pwa-document-preview";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { PwaBackButton } from "../PwaBackButton";
import { PWA_ROUTES } from "../pwaRoutes";

type PortalData = ReturnType<typeof usePwaPortalData>;
type TemplateScope = TemplateRecord["templateScope"];

const scopeLabels: Record<TemplateScope, string> = {
  document_submission: "Required Documents",
  other: "Other Templates",
};

const getTemplateFileName = (template: TemplateRecord) => {
  if (template.templateFileName.trim()) return template.templateFileName.trim();
  const source = template.templateFileUrl.split(/[?#]/)[0];
  const fromUrl = source.split("/").pop()?.trim();
  return fromUrl || template.name;
};

const getFileExtension = (template: TemplateRecord) => {
  const source = `${getTemplateFileName(template)} ${template.templateFileUrl}`.toLowerCase();
  const match = source.match(/\.([a-z0-9]{1,8})(?:[\s?#]|$)/);
  if (match) return match[1];
  const mime = template.templateFileType.toLowerCase();
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("word")) return "docx";
  if (mime.includes("sheet") || mime.includes("excel")) return "xlsx";
  return "";
};

const getFileTypeLabel = (template: TemplateRecord) => getFileExtension(template).toUpperCase() || "FILE";
const canPreview = (template: TemplateRecord) => ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg"].includes(getFileExtension(template));
const hasFile = (template: TemplateRecord) => Boolean(template.templateFileUrl.trim() && !template.templateFileUrl.startsWith("#"));

const formatUpdatedDate = (value: string) => {
  if (!value) return "Update date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Update date unavailable";
  return `Updated ${new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date)}`;
};

const sanitizeDownloadName = (value: string) =>
  value.replace(/[<>:"/\\|?*]/g, "-").replace(/\s+/g, " ").trim() || "template";

const uniqueZipName = (requestedName: string, usedNames: Set<string>) => {
  const safeName = sanitizeDownloadName(requestedName);
  const dotIndex = safeName.lastIndexOf(".");
  const base = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
  const extension = dotIndex > 0 ? safeName.slice(dotIndex) : "";
  let candidate = safeName;
  let index = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${base} (${index})${extension}`;
    index += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
};

const resolvedDownloadName = (template: TemplateRecord) => {
  const stored = getTemplateFileName(template);
  if (stored.includes(".")) return sanitizeDownloadName(stored);
  const extension = getFileExtension(template);
  return sanitizeDownloadName(`${template.name}${extension ? `.${extension}` : ""}`);
};

async function fetchTemplateBlob(template: TemplateRecord) {
  const resolvedUrl = await resolveSupabaseFileUrl(template.templateFileUrl);
  if (!resolvedUrl) throw new Error(`${template.name} is currently unavailable.`);
  const response = await fetch(resolvedUrl);
  if (!response.ok) throw new Error(`Unable to download ${template.name}.`);
  return response.blob();
}

async function downloadTemplate(template: TemplateRecord) {
  const blob = await fetchTemplateBlob(template);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = resolvedDownloadName(template);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function FileTypeIcon({ template }: { template: TemplateRecord }) {
  const extension = getFileExtension(template);
  const Icon = extension === "xlsx" || extension === "xls" || extension === "csv"
    ? FileSpreadsheet
    : extension === "zip" || extension === "rar"
      ? FileArchive
      : extension === "pdf" || extension === "doc" || extension === "docx"
        ? FileText
        : File;
  return <span className="pwa-template-file-icon"><Icon aria-hidden="true" /><small>{getFileTypeLabel(template)}</small></span>;
}

function TemplateRow({ template, onPreview, onDownload, downloading }: {
  template: TemplateRecord;
  onPreview: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const available = hasFile(template);
  return (
    <article className="pwa-template-row">
      <FileTypeIcon template={template} />
      <div className="pwa-template-row-copy">
        <h3>{template.name}</h3>
        <p>{template.description || template.templateDescription || "Official organization template."}</p>
        <div className="pwa-template-meta">
          <span>{getFileTypeLabel(template)}</span><span aria-hidden="true">·</span><span>{formatUpdatedDate(template.templateUploadedAt)}</span>
        </div>
        <small className="pwa-template-file-name">{available ? resolvedDownloadName(template) : "This template file is currently unavailable."}</small>
      </div>
      {!available ? <span className="pwa-template-unavailable">Unavailable</span> : null}
      <div className="pwa-template-actions">
        <Button variant="outline" disabled={!available} onClick={onPreview}><Eye aria-hidden="true" />Preview</Button>
        <Button variant="outline" disabled={!available || downloading} onClick={onDownload}><Download aria-hidden="true" />{downloading ? "Downloading..." : "Download"}</Button>
      </div>
    </article>
  );
}

export function PwaTemplateLibrary({ data }: { data: PortalData }) {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"all" | TemplateScope>("all");
  const [downloadingId, setDownloadingId] = useState("");
  const [downloadingAll, setDownloadingAll] = useState(false);
  const scopes = useMemo(() => Array.from(new Set(data.templates.map((template) => template.templateScope))), [data.templates]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.templates.filter((template) => {
      if (scope !== "all" && template.templateScope !== scope) return false;
      if (!query) return true;
      return [
        template.name,
        template.description,
        template.templateDescription,
        template.templateFileName,
        scopeLabels[template.templateScope],
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [data.templates, scope, search]);
  const groups = useMemo(() => (["document_submission", "other"] as const)
    .map((key) => ({ key, items: filtered.filter((template) => template.templateScope === key) }))
    .filter((group) => group.items.length), [filtered]);
  const downloadableCount = data.templates.filter(hasFile).length;

  const handleDownload = async (template: TemplateRecord) => {
    setDownloadingId(template.id);
    try {
      await downloadTemplate(template);
    } catch (error) {
      toast({ title: "Unable to download template", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setDownloadingId("");
    }
  };

  const handleDownloadAll = async () => {
    const available = data.templates.filter(hasFile);
    if (!available.length) {
      toast({ title: "No downloadable templates", description: "No template files are currently available.", variant: "destructive" });
      return;
    }
    setDownloadingAll(true);
    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();
      await Promise.all(available.map(async (template) => {
        const blob = await fetchTemplateBlob(template);
        zip.file(uniqueZipName(resolvedDownloadName(template), usedNames), blob);
      }));
      const archive = await zip.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "Y-TRACE-Official-Templates.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast({ title: "Unable to prepare templates", description: error instanceof Error ? error.message : "The ZIP archive could not be generated.", variant: "destructive" });
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <div className="pwa-stack pwa-template-library-page">
      <section className="pwa-template-summary">
        <span><FileText aria-hidden="true" /></span>
        <div><h2>Official Templates</h2><strong>{data.templates.length} active template{data.templates.length === 1 ? "" : "s"} available</strong><p>Preview or download forms published for your organization.</p></div>
      </section>
      <section className="pwa-template-controls">
        <label className="pwa-template-search"><Search aria-hidden="true" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates..." /></label>
        <div>
          {scopes.length > 1 ? (
            <select aria-label="Template category" value={scope} onChange={(event) => setScope(event.target.value as "all" | TemplateScope)}>
              <option value="all">All Categories</option>
              {scopes.map((item) => <option key={item} value={item}>{scopeLabels[item]}</option>)}
            </select>
          ) : <span />}
          <Button variant="outline" disabled={downloadingAll || !downloadableCount} onClick={() => void handleDownloadAll()}><Download aria-hidden="true" />{downloadingAll ? "Preparing..." : "Download All"}</Button>
        </div>
      </section>
      {groups.length ? (
        <section className="pwa-template-library">
          {groups.map((group) => (
            <div key={group.key} className="pwa-template-group">
              {groups.length > 1 ? <h2>{scopeLabels[group.key]}</h2> : null}
              <div>{group.items.map((template) => (
                <TemplateRow
                  key={template.id}
                  template={template}
                  downloading={downloadingId === template.id}
                  onPreview={() => requestPwaDocumentPreview(template.templateFileUrl, template.templateFileName || template.name)}
                  onDownload={() => void handleDownload(template)}
                />
              ))}</div>
            </div>
          ))}
        </section>
      ) : (
        <section className="pwa-card pwa-template-empty">
          <FileText aria-hidden="true" />
          <h2>{data.templates.length ? "No templates match your search." : "No templates are currently available."}</h2>
          <p>{data.templates.length ? "Try another search or category." : "Published templates from the administrator will appear here."}</p>
        </section>
      )}
    </div>
  );
}

export function PwaTemplatePreview({ data }: { data: PortalData }) {
  const { templateId } = useParams();
  const template = data.templates.find((item) => item.id === templateId);
  const templateFileUrl = template?.templateFileUrl.trim() ?? "";
  const [downloading, setDownloading] = useState(false);

  if (!template) {
    return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.templates} label="Templates" /><section className="pwa-card pwa-template-empty"><FileText /><h2>Template not found.</h2><p>This template may no longer be available.</p></section></div>;
  }

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadTemplate(template);
    } catch (reason) {
      toast({ title: "Unable to download template", description: reason instanceof Error ? reason.message : "Please try again.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };
  const available = hasFile(template);
  return (
    <div className="pwa-stack pwa-template-preview-page">
      <PwaBackButton fallback={PWA_ROUTES.templates} label="Templates" />
      <section className="pwa-card pwa-template-preview-heading">
        <FileTypeIcon template={template} />
        <div><h2>{template.name}</h2><p>{template.description || template.templateDescription}</p><div><span>{getFileTypeLabel(template)}</span><span>·</span><span>{formatUpdatedDate(template.templateUploadedAt)}</span></div><small>{available ? resolvedDownloadName(template) : "This template file is currently unavailable."}</small></div>
      </section>
      <section className="pwa-card pwa-template-preview-state"><FileText aria-hidden="true" /><h3>{available ? "Template preview" : "This template file is currently unavailable."}</h3>{available ? <><p>Open this file in the secure document preview.</p><Button variant="outline" onClick={() => requestPwaDocumentPreview(templateFileUrl, template.templateFileName || template.name)}>View Template</Button></> : null}</section>
      <Button className="pwa-template-download-primary" disabled={!available || downloading} onClick={() => void handleDownload()}><Download aria-hidden="true" />{downloading ? "Downloading..." : "Download Template"}</Button>
    </div>
  );
}
