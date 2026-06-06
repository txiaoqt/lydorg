import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Calendar, ExternalLink, FileText, Plus, Search, UploadCloud } from "lucide-react";
import { format } from "date-fns";
import { DataTable } from "../components/DataTable";
import { DOCUMENT_TYPE_LABELS, DocumentTypeBadge, getDocumentTypeLabel } from "../components/DocumentTypeBadge";
import { LegendHelpButton } from "../components/LegendHelpButton";
import { LegendModal } from "../components/LegendModal";
import { documentTypeLegendItems } from "../components/legend-config";
import { DisclosureDocType, DisclosureDocument, QuarterCode } from "../types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Option = {
  id: string;
  name: string;
  code?: string;
};

type DocumentForm = {
  docCode: string;
  title: string;
  documentType: DisclosureDocType;
  documentTypeOther: string;
  fiscalYear: string;
  quarter: QuarterCode;
  appliesToAllBarangays: boolean;
  barangayId: string;
  officeId: string;
  publishedDate: string;
};

const DOC_TYPES: DisclosureDocType[] = [
  "ordinance",
  "resolution",
  "executive_order",
  "bac_document",
  "financial_statement",
  "program_outcome",
  "other",
];

const MIME_OPTIONS = [
  { label: "PDF (.pdf)", value: "application/pdf" },
  { label: "Word (.doc)", value: "application/msword" },
  { label: "Word (.docx)", value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { label: "Excel (.xls)", value: "application/vnd.ms-excel" },
  { label: "Excel (.xlsx)", value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { label: "CSV (.csv)", value: "text/csv" },
  { label: "PowerPoint (.ppt)", value: "application/vnd.ms-powerpoint" },
  { label: "PowerPoint (.pptx)", value: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  { label: "Image (.jpg/.png)", value: "image/jpeg" },
  { label: "Image (.png)", value: "image/png" },
];

const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png";
const QUARTERS: QuarterCode[] = ["Q1", "Q2", "Q3", "Q4"];
const STORAGE_BUCKET = "transparency-documents";
const EXTENSION_MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};


const defaultForm: DocumentForm = {
  docCode: "",
  title: "",
  documentType: "ordinance",
  documentTypeOther: "",
  fiscalYear: String(new Date().getFullYear()),
  quarter: "Q1",
  appliesToAllBarangays: true,
  barangayId: "",
  officeId: "",
  publishedDate: new Date().toISOString().slice(0, 10),
};

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");

const formatFileSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return "N/A";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

const detectFileMimeType = (file: File) => {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME_MAP[extension] || "application/octet-stream";
};

const formatMimeType = (mime?: string | null) =>
  MIME_OPTIONS.find((item) => item.value === mime)?.label ?? (mime || "N/A");

export const Documents = () => {
  const [docs, setDocs] = useState<DisclosureDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DisclosureDocument | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DisclosureDocument | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<DisclosureDocument | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTypeLegendOpen, setIsTypeLegendOpen] = useState(false);
  const [form, setForm] = useState<DocumentForm>(defaultForm);
  const [barangayOptions, setBarangayOptions] = useState<Option[]>([]);
  const [officeOptions, setOfficeOptions] = useState<Option[]>([]);
  const { toast } = useToast();

  const getDocumentFileUrl = (doc: DisclosureDocument | null) => {
    if (!doc) return "";
    if (doc.public_url) return doc.public_url;
    if (doc.storage_path && supabase) {
      return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(doc.storage_path).data.publicUrl;
    }
    return "";
  };

  const generateUniqueDocCode = async () => {
    const fallback = `DOC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    if (!supabase) return fallback;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate = `DOC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const { data, error } = await supabase.from("disclosure_documents").select("id").eq("doc_code", candidate).maybeSingle();
      if (!error && !data) {
        return candidate;
      }
    }

    return fallback;
  };

  const loadOptions = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setBarangayOptions([]);
      setOfficeOptions([]);
      return;
    }

    const [barangaysResp, officesResp] = await Promise.all([
      supabase.from("barangays").select("id,name").order("name", { ascending: true }),
      supabase.from("offices").select("id,name,code").order("name", { ascending: true }),
    ]);

    setBarangayOptions((barangaysResp.data ?? []) as Option[]);
    setOfficeOptions((officesResp.data ?? []) as Option[]);
  };

  const loadDocuments = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      setDocs([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.from("disclosure_documents").select("*").order("published_date", { ascending: false });
    if (error) {
      toast({ title: "Load Failed", description: error.message });
      setDocs([]);
      setIsLoading(false);
      return;
    }

    setDocs((data ?? []) as DisclosureDocument[]);
    setIsLoading(false);
  };

  useEffect(() => {
    void Promise.all([loadDocuments(), loadOptions()]);
  }, []);

  const openCreateModal = () => {
    setEditingDoc(null);
    setSelectedFile(null);
    setForm(defaultForm);
    setIsFormOpen(true);
    void (async () => {
      const generatedCode = await generateUniqueDocCode();
      setForm((prev) => ({ ...prev, docCode: generatedCode }));
    })();
  };

  const openEditModal = (doc: DisclosureDocument) => {
    setEditingDoc(doc);
    setSelectedFile(null);
    setForm({
      docCode: doc.doc_code ?? "",
      title: doc.title ?? "",
      documentType: doc.document_type ?? "ordinance",
      documentTypeOther: doc.document_type_other ?? "",
      fiscalYear: String(doc.fiscal_year ?? new Date().getFullYear()),
      quarter: doc.quarter ?? "Q1",
      appliesToAllBarangays: doc.applies_to_all_barangays ?? false,
      barangayId: doc.barangay_id ?? "",
      officeId: doc.office_id ?? "",
      publishedDate: doc.published_date ?? new Date().toISOString().slice(0, 10),
    });
    setIsFormOpen(true);
  };

  const openDeleteModal = (doc: DisclosureDocument) => {
    setDeletingDoc(doc);
    setIsDeleteDialogOpen(true);
  };

  const openDetailsModal = (doc: DisclosureDocument) => {
    setViewingDoc(doc);
    setIsDetailsOpen(true);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const saveDocument = async (event: FormEvent) => {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: "Supabase Not Configured",
        description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.",
      });
      return;
    }

    if (!form.title.trim()) {
      toast({ title: "Missing Fields", description: "Document title is required." });
      return;
    }

    if (form.documentType === "other" && !form.documentTypeOther.trim()) {
      toast({ title: "Missing Type Name", description: "Please enter the custom document type." });
      return;
    }

    const fiscalYear = Number(form.fiscalYear);
    if (!Number.isInteger(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2100) {
      toast({ title: "Invalid Year", description: "Fiscal year must be between 2000 and 2100." });
      return;
    }

    if (!form.appliesToAllBarangays && !form.barangayId) {
      toast({ title: "Missing Barangay", description: "Select a barangay or enable 'All Barangays'." });
      return;
    }

    if (!editingDoc && !selectedFile) {
      toast({ title: "Missing File", description: "Upload a document file first." });
      return;
    }

    const docCode = form.docCode.trim() || (await generateUniqueDocCode());

    setIsSaving(true);
    let storagePath = editingDoc?.storage_path ?? null;
    let publicUrl = getDocumentFileUrl(editingDoc) || null;
    let fileSizeBytes = editingDoc?.file_size_bytes ?? null;
    let fileMimeType = editingDoc?.file_mime_type ?? null;
    let uploadedPath: string | null = null;

    if (selectedFile) {
      const safeFileName = sanitizeFileName(selectedFile.name);
      fileMimeType = detectFileMimeType(selectedFile);
      const filePath = `disclosures/${fiscalYear}/${docCode}-${Date.now()}-${safeFileName}`;
      const uploadResult = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, selectedFile, {
        contentType: fileMimeType || undefined,
        upsert: false,
      });

      if (uploadResult.error) {
        setIsSaving(false);
        toast({ title: "Upload Failed", description: uploadResult.error.message });
        return;
      }

      uploadedPath = filePath;
      storagePath = filePath;
      publicUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath).data.publicUrl;
      fileSizeBytes = selectedFile.size;
    }

    const payload = {
      doc_code: docCode,
      title: form.title.trim(),
      document_type: form.documentType,
      document_type_other: form.documentType === "other" ? form.documentTypeOther.trim() : null,
      fiscal_year: fiscalYear,
      quarter: form.quarter,
      barangay_id: form.appliesToAllBarangays ? null : form.barangayId || null,
      applies_to_all_barangays: form.appliesToAllBarangays,
      office_id: form.officeId || null,
      published_date: form.publishedDate || new Date().toISOString().slice(0, 10),
      file_size_bytes: fileSizeBytes,
      file_mime_type: fileMimeType,
      storage_path: storagePath,
      public_url: publicUrl,
    };

    let error: { message: string } | null = null;
    if (editingDoc) {
      const result = await supabase.from("disclosure_documents").update(payload).eq("id", editingDoc.id);
      error = result.error;
    } else {
      const result = await supabase.from("disclosure_documents").insert(payload);
      error = result.error;
    }

    if (error && uploadedPath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
    }

    if (!error && editingDoc?.storage_path && uploadedPath && editingDoc.storage_path !== uploadedPath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([editingDoc.storage_path]);
    }

    setIsSaving(false);
    if (error) {
      toast({ title: "Save Failed", description: error.message });
      return;
    }

    toast({
      title: editingDoc ? "Document Updated" : "Document Created",
      description: `${form.title.trim()} saved successfully.`,
    });
    setIsFormOpen(false);
    setEditingDoc(null);
    setSelectedFile(null);
    setForm(defaultForm);
    void loadDocuments();
  };

  const deleteDocument = async () => {
    if (!deletingDoc) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: "Supabase Not Configured",
        description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.",
      });
      return;
    }

    const targetDoc = deletingDoc;
    setIsDeleting(true);
    const { error } = await supabase.from("disclosure_documents").delete().eq("id", targetDoc.id);
    setIsDeleting(false);

    if (error) {
      toast({ title: "Delete Failed", description: error.message });
      return;
    }

    if (targetDoc.storage_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([targetDoc.storage_path]);
    }

    toast({
      title: "Document Deleted",
      description: `${targetDoc.title} was removed.`,
    });

    if (editingDoc?.id === targetDoc.id) {
      setEditingDoc(null);
      setSelectedFile(null);
      setForm(defaultForm);
      setIsFormOpen(false);
    }

    setDeletingDoc(null);
    setIsDeleteDialogOpen(false);
    void loadDocuments();
  };

  const columns = [
    {
      header: "Document",
      accessor: (d: DisclosureDocument) => {
        const href = getDocumentFileUrl(d);
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <FileText size={20} />
            </div>
            <div className="flex flex-col">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="font-bold text-foreground hover:text-primary underline-offset-2 hover:underline inline-flex items-center gap-1"
                >
                  {d.title}
                  <ExternalLink size={14} />
                </a>
              ) : (
                <span className="font-bold text-foreground">{d.title}</span>
              )}
              <span className="text-xs text-muted-foreground font-medium">{d.doc_code}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: "Type",
      accessor: (d: DisclosureDocument) => <DocumentTypeBadge doc={d} />,
    },
    {
      header: "Fiscal Period",
      accessor: (d: DisclosureDocument) => (
        <div className="flex flex-col text-xs font-medium text-muted-foreground">
          <span>FY {d.fiscal_year}</span>
          <span className="text-muted-foreground uppercase">{d.quarter}</span>
        </div>
      ),
    },
    {
      header: "Published",
      accessor: (d: DisclosureDocument) => (
        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Calendar size={12} className="text-muted-foreground" />
          {format(new Date(d.published_date), "MMM d, yyyy")}
        </div>
      ),
    },
    {
      header: "File",
      accessor: (d: DisclosureDocument) => {
        const href = getDocumentFileUrl(d);
        return (
          <div className="flex flex-col text-xs font-medium text-muted-foreground">
            <span>{formatMimeType(d.file_mime_type)}</span>
            <span>{formatFileSize(d.file_size_bytes)}</span>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="text-primary hover:underline mt-1 inline-flex items-center gap-1"
              >
                Open file
                <ExternalLink size={12} />
              </a>
            ) : (
              <span className="mt-1 text-muted-foreground/70">No uploaded file</span>
            )}
          </div>
        );
      },
    },
  ];

  const filteredDocs = useMemo(
    () =>
      docs.filter(
        (d) =>
          d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.doc_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          getDocumentTypeLabel(d).toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [docs, searchTerm],
  );

  const displayedFileSize = selectedFile ? formatFileSize(selectedFile.size) : formatFileSize(editingDoc?.file_size_bytes);
  const displayedMimeType = selectedFile ? detectFileMimeType(selectedFile) : editingDoc?.file_mime_type ?? null;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">Transparency Documents</h1>
            <LegendHelpButton
              onClick={() => setIsTypeLegendOpen(true)}
              ariaLabel="View document type color legend"
            />
          </div>
          <p className="text-muted-foreground mt-1 font-medium">Upload public files and keep the transparency registry up to date.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all"
        >
          <Plus size={20} />
          Upload Document
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 card-shadow">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Documents</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{docs.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 card-shadow">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">With Uploaded File</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{docs.filter((doc) => Boolean(doc.public_url)).length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 card-shadow">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Custom Type Docs</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{docs.filter((doc) => doc.document_type === "other").length}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-card p-4 rounded-2xl border border-border card-shadow">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search documents by title, code, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-all outline-none"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredDocs}
        isLoading={isLoading}
        onRowClick={openDetailsModal}
        getRowAriaLabel={(item) => `Open details for document ${item.title}`}
      />

      <LegendModal
        open={isTypeLegendOpen}
        onOpenChange={setIsTypeLegendOpen}
        title="Document Type Legend"
        description="These colors help identify transparency document categories quickly."
        items={documentTypeLegendItems}
      />

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="flex w-[min(900px,calc(100vw-1.5rem))] max-h-[90vh] flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="border-b border-border/80 px-6 py-5 pr-12 text-left">
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>Read-only record view.</DialogDescription>
          </DialogHeader>
          {viewingDoc && (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">1. Basic Information</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div><p className="text-xs text-muted-foreground">Document Code</p><p className="text-sm font-medium">{viewingDoc.doc_code || "N/A"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Title</p><p className="text-sm font-medium">{viewingDoc.title || "N/A"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Type</p><p className="text-sm font-medium">{getDocumentTypeLabel(viewingDoc)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Published</p><p className="text-sm font-medium">{viewingDoc.published_date ? format(new Date(viewingDoc.published_date), "MMM d, yyyy") : "N/A"}</p></div>
                </div>
              </section>
              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">2. Fiscal Scope</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div><p className="text-xs text-muted-foreground">Fiscal Year</p><p className="text-sm font-medium">{viewingDoc.fiscal_year ?? "N/A"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Quarter</p><p className="text-sm font-medium">{viewingDoc.quarter || "N/A"}</p></div>
                </div>
              </section>
              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">3. File</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div><p className="text-xs text-muted-foreground">MIME Type</p><p className="text-sm font-medium">{formatMimeType(viewingDoc.file_mime_type)}</p></div>
                  <div><p className="text-xs text-muted-foreground">File Size</p><p className="text-sm font-medium">{formatFileSize(viewingDoc.file_size_bytes)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Public URL</p><p className="text-sm font-medium break-all">{getDocumentFileUrl(viewingDoc) || "N/A"}</p></div>
                </div>
              </section>
            </div>
          )}
          <DialogFooter className="border-t border-border/80 px-6 py-3 sm:justify-between">
            <p className="text-xs text-muted-foreground">Read-only record view.</p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
              <Button type="button" onClick={() => { if (!viewingDoc) return; setIsDetailsOpen(false); openEditModal(viewingDoc); }}>Edit</Button>
              <Button type="button" variant="destructive" onClick={() => { if (!viewingDoc) return; setIsDetailsOpen(false); openDeleteModal(viewingDoc); }}>Delete</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Edit Document" : "Create Document"}</DialogTitle>
            <DialogDescription>Document metadata and file upload are saved directly to Supabase.</DialogDescription>
          </DialogHeader>

          <form onSubmit={saveDocument} className="space-y-5">
            <div className="rounded-xl border border-border p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Document Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-code">Document Code</Label>
                  <Input
                    id="doc-code"
                    value={form.docCode}
                    readOnly
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">Auto-generated to keep document codes unique.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-title">Title</Label>
                  <Input
                    id="doc-title"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-type">Document Type</Label>
                  <select
                    id="doc-type"
                    value={form.documentType}
                    onChange={(e) => setForm((prev) => ({ ...prev, documentType: e.target.value as DisclosureDocType }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {DOC_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {DOCUMENT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                {form.documentType === "other" && (
                  <div className="space-y-2">
                    <Label htmlFor="doc-type-other">Custom Document Type</Label>
                    <Input
                      id="doc-type-other"
                      value={form.documentTypeOther}
                      onChange={(e) => setForm((prev) => ({ ...prev, documentTypeOther: e.target.value }))}
                      placeholder="e.g. Procurement Plan"
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="doc-quarter">Quarter</Label>
                  <select
                    id="doc-quarter"
                    value={form.quarter}
                    onChange={(e) => setForm((prev) => ({ ...prev, quarter: e.target.value as QuarterCode }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {QUARTERS.map((quarter) => (
                      <option key={quarter} value={quarter}>
                        {quarter}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-year">Fiscal Year</Label>
                  <Input
                    id="doc-year"
                    type="number"
                    min={2000}
                    max={2100}
                    value={form.fiscalYear}
                    onChange={(e) => setForm((prev) => ({ ...prev, fiscalYear: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-date">Published Date</Label>
                  <Input
                    id="doc-date"
                    type="date"
                    value={form.publishedDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, publishedDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-office">Office</Label>
                  <select
                    id="doc-office"
                    value={form.officeId}
                    onChange={(e) => setForm((prev) => ({ ...prev, officeId: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">None</option>
                    {officeOptions.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.code ? `${office.name} (${office.code})` : office.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-barangay">Barangay</Label>
                  <select
                    id="doc-barangay"
                    value={form.barangayId}
                    onChange={(e) => setForm((prev) => ({ ...prev, barangayId: e.target.value }))}
                    disabled={form.appliesToAllBarangays}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                  >
                    <option value="">None</option>
                    {barangayOptions.map((barangay) => (
                      <option key={barangay.id} value={barangay.id}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={form.appliesToAllBarangays}
                      onChange={(e) => setForm((prev) => ({ ...prev, appliesToAllBarangays: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    Applies to all barangays
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">File Attachment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-mime">Detected File Type</Label>
                  <Input id="doc-mime" value={formatMimeType(displayedMimeType)} readOnly className="bg-muted/50" />
                  <p className="text-xs text-muted-foreground">Detected automatically from the uploaded file.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-size">File Size</Label>
                  <Input id="doc-size" value={displayedFileSize} readOnly className="bg-muted/50" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="doc-file">Upload File</Label>
                  <Input id="doc-file" type="file" accept={FILE_ACCEPT} onChange={onFileChange} />
                  <p className="text-xs text-muted-foreground">
                    File upload is required for new documents. For existing documents, upload only if replacing the old file.
                  </p>
                  {selectedFile && (
                    <p className="text-sm font-medium text-foreground inline-flex items-center gap-2">
                      <UploadCloud size={14} />
                      {selectedFile.name}
                    </p>
                  )}
                  {!selectedFile && getDocumentFileUrl(editingDoc) && (
                    <a
                      href={getDocumentFileUrl(editingDoc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Open current file
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingDoc ? "Save Changes" : "Create Document"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDeletingDoc(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingDoc
                ? `Are you sure you want to delete "${deletingDoc.title}"? This will also remove it from the transparency registry.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteDocument}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Document"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

