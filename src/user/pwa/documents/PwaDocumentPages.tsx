import { useId, useMemo, useRef, useState, type DragEvent } from "react";
import JSZip from "jszip";
import {
  AlertCircle, CalendarClock, CheckCircle2, ChevronRight, Download, Eye, FileArchive, FileText, Info,
  Loader2, MessageSquareWarning, Trash2, UploadCloud,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { StatusBadge } from "@/components/portal/StatusBadge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  removeOrganizationDocumentFromSupabase,
  replaceOrganizationDocumentFileInSupabase,
  resolveSupabaseFileUrl,
  submitOrganizationDocumentsBatchToSupabase,
} from "@/lib/lydo-connect-supabase";
import type { SubmissionFile } from "@/lib/lydo-connect-data";
import { resolveRegistrationDocumentAccess } from "@/lib/document-file-access";
import { PwaBackButton } from "../PwaBackButton";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { PWA_ROUTES, pwaDocumentDetailRoute } from "../pwaRoutes";
import { isUrnRegistration, urnReviewLabels } from "@/lib/urn-registration";
import {
  DOCUMENT_UPLOAD_MAX_BYTES,
  formatDocumentFileSize,
  getAcceptedDocumentFormats,
  getDocumentInputAccept,
  validateOrganizationDocumentFile,
} from "./documentFileValidation";

type PortalData = ReturnType<typeof usePwaPortalData>;
type PendingFile = { id: string; file: File; documentTypeId: string };

const approvedStatuses = new Set(["approved", "approved_green"]);
const initialUploadStatuses = new Set(["draft"]);
const correctionStatuses = new Set(["needs_revision", "rejected_red"]);
const reviewStatuses = new Set(["uploaded", "ready_for_review", "submitted", "under_admin_review"]);

const getDocumentPresentation = (file?: SubmissionFile) => {
  if (!file) return { status: "not_started", label: "Missing", supportingText: "No file uploaded" };
  if (approvedStatuses.has(file.adminStatus)) {
    return { status: file.adminStatus, label: "Approved", supportingText: "" };
  }
  if (reviewStatuses.has(file.adminStatus)) {
    return { status: "under_admin_review", label: "Under Admin Review", supportingText: "Awaiting admin review" };
  }
  if (file.adminStatus === "needs_revision" || file.adminStatus === "rejected_red") {
    return {
      status: file.adminStatus,
      label: file.adminStatus === "needs_revision" ? "Needs Revision" : "Rejected",
      supportingText: "Action required",
    };
  }
  return { status: "draft", label: "Draft", supportingText: "Saved as draft" };
};

const saveBlob = (blob: Blob, name: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

const downloadReference = async (reference: string, name: string) => {
  const resolved = await resolveSupabaseFileUrl(reference);
  const response = await fetch(resolved);
  if (!response.ok) throw new Error(`Unable to download ${name}.`);
  saveBlob(await response.blob(), name);
};

const formatDocumentDateTime = (value?: string) => {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const getFileFormat = (file: SubmissionFile) => {
  const extension = file.fileName.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 5 ? extension : file.fileType || "File";
};

export function PwaDocumentList({ data }: { data: PortalData }) {
  const { go } = usePwaNavigation();
  if (isUrnRegistration(data.profile)) {
    const status = data.profile!.urnReviewStatus;
    return (
      <div className="pwa-stack">
        <section className="pwa-card">
          <p className="pwa-eyebrow">Registration</p>
          <h2>Unique Registration Number (URN)</h2>
          <p className="mt-3 text-sm text-muted-foreground">Submitted URN</p>
          <strong className="break-all text-lg">{data.profile!.urn}</strong>
          <div className="mt-3"><StatusBadge status={status === "verified" ? "approved_green" : status === "rejected" ? "rejected_red" : status === "needs_correction" ? "needs_revision" : "under_admin_review"} label={urnReviewLabels[status]} /></div>
          <p className="mt-3 text-sm">
            {status === "verified"
              ? "Your existing registration record was confirmed. The six initial registration documents are waived."
              : status === "needs_correction"
                ? "The submitted URN could not be confirmed. Review the admin feedback and update the number."
                : status === "rejected"
                  ? "LYDO / PCYDO could not confirm the submitted registration record."
                  : "LYDO / PCYDO is checking your registration against its official record. No document upload is required."}
          </p>
          {data.profile!.urnAdminRemarks ? <div className="mt-3 rounded-lg bg-muted p-3 text-sm"><strong>Admin feedback</strong><p>{data.profile!.urnAdminRemarks}</p></div> : null}
          {(status === "needs_correction" || status === "rejected") ? (
            <button type="button" className="pwa-primary-button mt-4" onClick={() => go(PWA_ROUTES.profileEdit)}>Update URN</button>
          ) : null}
        </section>
      </div>
    );
  }
  const byType = new Map(data.documentFiles.map((file) => [file.documentTypeId, file]));
  const total = data.requiredTemplates.length;
  const submissionLocked = data.submission?.status === "approved_green" || (data.submission?.status as string | undefined) === "approved";
  const allApproved = total > 0 && data.approvedDocuments === total;
  const canManageDocuments = !submissionLocked && data.requiredTemplates.some((template) => {
    const file = byType.get(template.id);
    return !file || initialUploadStatuses.has(file.adminStatus);
  });
  const helper = data.underReviewDocuments
    ? `${data.underReviewDocuments} under admin review`
    : data.revisionDocuments.length
      ? `${data.revisionDocuments.length} need revision`
      : data.missingDocuments
        ? `${data.missingDocuments} files still missing`
        : "Track required files and review their current status.";

  return (
    <div className="pwa-stack">
      <section className="pwa-card pwa-document-summary">
        <div className="pwa-document-summary-heading">
          <span className="pwa-record-icon"><FileText aria-hidden="true" /></span>
          <div><h2>{data.approvedDocuments} of {total} documents approved</h2><p>{helper}</p></div>
        </div>
        <div className="pwa-progress" aria-label={`${data.documentPercent}% approved`}>
          <span style={{ width: `${data.documentPercent}%` }} />
        </div>
      </section>

      <section className="pwa-document-list" aria-label="Required documents">
        {data.requiredTemplates.map((template) => {
          const file = byType.get(template.id);
          const presentation = getDocumentPresentation(file);
          return (
            <button
              key={template.id}
              type="button"
              className="pwa-card pwa-document-item"
              onClick={() => go(pwaDocumentDetailRoute(template.id))}
            >
              <span className="pwa-record-icon"><FileText aria-hidden="true" /></span>
              <span className="pwa-document-copy">
                <strong>{template.name}</strong>
                <small>{file?.fileName || "No file uploaded"}</small>
                {presentation.supportingText && file ? <small className="pwa-document-state-copy">{presentation.supportingText}</small> : null}
                <StatusBadge className="pwa-document-status" status={presentation.status} label={presentation.label} />
              </span>
              <ChevronRight className="pwa-document-chevron" aria-hidden="true" />
            </button>
          );
        })}
        {!total ? <div className="pwa-card pwa-empty-copy">No required documents are configured.</div> : null}
      </section>

      {canManageDocuments ? (
        <button type="button" className="pwa-primary-button" onClick={() => go(PWA_ROUTES.documentsManage)}>
          <UploadCloud aria-hidden="true" /> Upload or Manage Documents
        </button>
      ) : null}
      {allApproved ? (
        <section className="pwa-card pwa-completion-message">
          <strong>All required documents are approved.</strong>
          <p>Approved documents are locked and cannot be replaced unless the admin explicitly reopens one for revision.</p>
        </section>
      ) : null}
    </div>
  );
}

export function PwaDocumentDetail({ data }: { data: PortalData }) {
  const { documentId = "" } = useParams();
  const { go } = usePwaNavigation();
  const inputRef = useRef<HTMLInputElement>(null);
  const reuploadTriggerRef = useRef<HTMLButtonElement>(null);
  const pickerButtonRef = useRef<HTMLButtonElement>(null);
  const validationSequenceRef = useRef(0);
  const replacementInputId = useId();
  const replacementHelpId = useId();
  const replacementErrorId = useId();
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementError, setReplacementError] = useState("");
  const [replacementStatus, setReplacementStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [replacementAnnouncement, setReplacementAnnouncement] = useState("");
  const [replacing, setReplacing] = useState(false);
  const template = data.requiredTemplates.find((item) => item.id === documentId);
  const file = data.documentFiles.find((item) => item.documentTypeId === documentId);
  if (!template) {
    return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.documents} /><section className="pwa-card pwa-empty-copy">Document requirement not found.</section></div>;
  }

  const openReference = async (reference: string) => {
    try {
      const resolved = await resolveSupabaseFileUrl(reference);
      window.open(resolved, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({ title: "Unable to open file", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };

  const requiresCorrection = Boolean(file && correctionStatuses.has(file.adminStatus));
  const latestRevision = file?.revisionHistory?.at(-1);
  const fileAccess = resolveRegistrationDocumentAccess({
    file,
    submissionApproved:
      data.submission?.status === "approved_green" ||
      (data.submission?.status as string | undefined) === "approved",
  });
  const previousRemark = latestRevision?.adminRemarks || (
    file?.adminRemarks && !/^awaiting admin review\.?$/i.test(file.adminRemarks.trim())
      ? file.adminRemarks
      : ""
  );

  const closeReplacement = (open: boolean) => {
    if (replacing) return;
    setReplaceOpen(open);
    if (!open) {
      validationSequenceRef.current += 1;
      setReplacementFile(null);
      setReplacementError("");
      setReplacementStatus("idle");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const selectReplacement = async (selected?: File) => {
    const validationSequence = ++validationSequenceRef.current;
    setReplacementFile(selected ?? null);
    setReplacementError("");
    if (!selected) {
      setReplacementStatus("idle");
      return;
    }

    setReplacementStatus("validating");
    setReplacementAnnouncement(`${selected.name} selected. Checking the file.`);
    try {
      const issue = await validateOrganizationDocumentFile(documentId, selected);
      if (validationSequence !== validationSequenceRef.current) return;
      setReplacementError(issue);
      setReplacementStatus(issue ? "invalid" : "valid");
      setReplacementAnnouncement(issue || `${selected.name} is ready to upload.`);
    } catch {
      if (validationSequence !== validationSequenceRef.current) return;
      const issue = "The selected file could not be read. Choose another file.";
      setReplacementError(issue);
      setReplacementStatus("invalid");
      setReplacementAnnouncement(issue);
    }
  };

  const openReplacementPicker = () => {
    if (replacing) return;
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  const removeReplacement = () => {
    if (replacing) return;
    validationSequenceRef.current += 1;
    setReplacementFile(null);
    setReplacementError("");
    setReplacementStatus("idle");
    setReplacementAnnouncement("Selected file removed.");
    if (inputRef.current) inputRef.current.value = "";
    window.requestAnimationFrame(() => pickerButtonRef.current?.focus());
  };

  const submitReplacement = async () => {
    if (!file || !replacementFile) {
      setReplacementError("Choose the corrected file before submitting.");
      return;
    }
    const issue = await validateOrganizationDocumentFile(documentId, replacementFile);
    if (issue) {
      setReplacementError(issue);
      return;
    }

    setReplacing(true);
    setReplacementError("");
    setReplacementAnnouncement("Uploading corrected file.");
    try {
      await replaceOrganizationDocumentFileInSupabase({
        fileId: file.id,
        documentTypeId: template.databaseId,
        expectedUpdatedAt: file.updatedAt,
        file: replacementFile,
      });
      await data.refresh();
      setReplaceOpen(false);
      setReplacementFile(null);
      setReplacementStatus("idle");
      if (inputRef.current) inputRef.current.value = "";
      setReplacementAnnouncement(`${template.name} corrected file uploaded successfully.`);
      toast({
        title: "Corrected file submitted",
        description: `${template.name} is now back under admin review.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The corrected file could not be uploaded. Check your connection and try again.";
      setReplacementError(message);
      setReplacementAnnouncement(`Upload failed. ${message}`);
    } finally {
      setReplacing(false);
    }
  };

  const replacementFormat = replacementFile
    ? replacementFile.name.split(".").pop()?.toUpperCase() || replacementFile.type || "File"
    : "";
  const acceptedFormats = getAcceptedDocumentFormats(documentId);
  const maximumSize = formatDocumentFileSize(DOCUMENT_UPLOAD_MAX_BYTES);
  const replacementDescribedBy = [replacementHelpId, replacementError ? replacementErrorId : ""].filter(Boolean).join(" ");

  return (
    <div className="pwa-stack">
      <PwaBackButton fallback={PWA_ROUTES.documents} label="Documents" />
      <section className="pwa-card pwa-detail-hero">
        <span className="pwa-record-icon"><FileText aria-hidden="true" /></span>
        <div><h2>{template.name}</h2><StatusBadge status={file?.adminStatus ?? "not_started"} label={file ? undefined : "Missing"} /></div>
      </section>
      {requiresCorrection ? (
        <section className={`pwa-card pwa-revision-notice ${file?.adminStatus === "rejected_red" ? "is-rejected" : ""}`}>
          <Info aria-hidden="true" />
          <div>
            <strong>{file?.adminStatus === "rejected_red" ? "This document was rejected." : "Admin requested changes to this document."}</strong>
            <p>{previousRemark || "Review the requirement and upload a corrected file."}</p>
          </div>
        </section>
      ) : null}
      <section className="pwa-card pwa-detail-list">
        <div><FileText /><span><small>Attached file</small><strong>{file?.fileName || "No file uploaded"}</strong></span></div>
        {file ? <div><Info /><span><small>File details</small><strong>{getFileFormat(file)} · {formatDocumentFileSize(file.fileSize)}</strong></span></div> : null}
        {file ? <div><CalendarClock /><span><small>{latestRevision ? "Resubmitted" : "Uploaded"}</small><strong>{formatDocumentDateTime(file.uploadedAt)}</strong></span></div> : null}
        {file?.reviewedAt ? <div><Eye /><span><small>Reviewed</small><strong>{formatDocumentDateTime(file.reviewedAt)}</strong></span></div> : null}
        {previousRemark ? <div><Eye /><span><small>{latestRevision ? "Previous review remark" : "Admin remark"}</small><strong>{previousRemark}</strong></span></div> : null}
      </section>
      <div className="pwa-button-stack">
        {requiresCorrection ? <button ref={reuploadTriggerRef} type="button" className="pwa-primary-button" onClick={() => setReplaceOpen(true)}><UploadCloud /> Re-upload File</button> : null}
        {fileAccess.canViewAttachedFile && file ? <button type="button" className="pwa-secondary-button" onClick={() => void openReference(file.fileUrl)}><Eye /> View Attached File</button> : null}
        {template.templateFileUrl ? <button type="button" className="pwa-secondary-button" onClick={() => void openReference(template.templateFileUrl)}><Download /> View Template</button> : null}
        {!file || initialUploadStatuses.has(file.adminStatus) ? <button type="button" className="pwa-primary-button" onClick={() => go(PWA_ROUTES.documentsManage)}><UploadCloud /> Upload in Document Manager</button> : null}
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{replacementAnnouncement}</p>

      <Dialog open={replaceOpen} onOpenChange={closeReplacement}>
        <DialogContent
          className={`pwa-reupload-dialog w-[calc(100vw-2rem)] max-w-md rounded-2xl ${replacing ? "is-uploading" : ""}`}
          data-uploading={replacing ? "true" : "false"}
          onEscapeKeyDown={(event) => {
            if (replacing) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (replacing) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (replacing) event.preventDefault();
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            window.requestAnimationFrame(() => pickerButtonRef.current?.focus());
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            reuploadTriggerRef.current?.focus();
          }}
        >
          <DialogHeader className="pwa-reupload-header">
            <DialogTitle>Re-upload corrected file</DialogTitle>
            <DialogDescription>
              Replace the file for this requirement only. The document type cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="pwa-reupload-content">
            <section className="pwa-reupload-feedback" aria-labelledby="revision-feedback-title">
              <MessageSquareWarning aria-hidden="true" />
              <div>
                <span>Revision requested</span>
                <strong id="revision-feedback-title">Admin feedback</strong>
                <p>{previousRemark || "No admin remark was provided."}</p>
              </div>
            </section>

            <dl className="pwa-reupload-metadata">
              <div><dt>Document</dt><dd className="pwa-reupload-document-name">{template.name}</dd></div>
              <div><dt>Current file</dt><dd title={file?.fileName}>{file?.fileName}</dd></div>
              <div><dt>Accepted format</dt><dd>{acceptedFormats}</dd></div>
              <div><dt>Maximum size</dt><dd>{maximumSize}</dd></div>
            </dl>

            <label htmlFor={replacementInputId} className="sr-only">
              Select one corrected file for {template.name}
            </label>
            <span id={replacementHelpId} className="sr-only">
              Select one file. Accepted format: {acceptedFormats}. Maximum size: {maximumSize}.
            </span>
            <input
              ref={inputRef}
              id={replacementInputId}
              className="sr-only"
              type="file"
              tabIndex={-1}
              accept={getDocumentInputAccept(documentId)}
              disabled={replacing}
              aria-invalid={replacementStatus === "invalid"}
              aria-describedby={replacementDescribedBy}
              onChange={(event) => void selectReplacement(event.target.files?.[0])}
            />

            {!replacementFile ? (
              <button
                ref={pickerButtonRef}
                type="button"
                className="pwa-reupload-picker"
                disabled={replacing}
                aria-controls={replacementInputId}
                aria-describedby={replacementHelpId}
                onClick={openReplacementPicker}
              >
                <span className="pwa-reupload-picker-icon"><UploadCloud aria-hidden="true" /></span>
                <strong>{acceptedFormats === "PDF" ? "Choose corrected PDF" : "Choose corrected file"}</strong>
                <span>Browse your device</span>
                <small>{acceptedFormats} &middot; Maximum {maximumSize}</small>
              </button>
            ) : (
              <section className={`pwa-selected-replacement is-${replacementStatus}`} aria-label="Selected corrected file">
                <FileText aria-hidden="true" />
                <div>
                  <strong title={replacementFile.name}>{replacementFile.name}</strong>
                  <small>{replacementFormat} &middot; {formatDocumentFileSize(replacementFile.size)}</small>
                  <span className="pwa-reupload-validation-status">
                    {replacementStatus === "validating" ? <Loader2 className="pwa-spin" aria-hidden="true" /> : null}
                    {replacementStatus === "valid" ? <CheckCircle2 aria-hidden="true" /> : null}
                    {replacementStatus === "invalid" ? <AlertCircle aria-hidden="true" /> : null}
                    {replacementStatus === "validating"
                      ? "Checking file..."
                      : replacementStatus === "valid"
                        ? "Ready to upload"
                        : "Needs attention"}
                  </span>
                </div>
                <div className="pwa-reupload-file-actions">
                  <button type="button" disabled={replacing} aria-controls={replacementInputId} onClick={openReplacementPicker}>Change</button>
                  <button type="button" disabled={replacing} onClick={removeReplacement}>Remove</button>
                </div>
              </section>
            )}

            <p id={replacementErrorId} className="pwa-reupload-error" role="alert" aria-live="assertive">
              {replacementError}
            </p>

            <div className="pwa-reupload-note">
              <Info aria-hidden="true" />
              <p>Submitting will replace only this requirement&apos;s current file and return the document to Under Admin Review.</p>
            </div>
          </div>
          <DialogFooter className="pwa-reupload-actions">
            <button
              type="button"
              className="pwa-primary-button"
              disabled={replacing || !replacementFile || replacementStatus !== "valid"}
              onClick={() => void submitReplacement()}
            >
              {replacing ? <Loader2 className="pwa-spin" aria-hidden="true" /> : <UploadCloud aria-hidden="true" />}
              {replacing ? "Uploading corrected file..." : "Submit Corrected File"}
            </button>
            <button type="button" className="pwa-secondary-button" disabled={replacing} onClick={() => closeReplacement(false)}>Cancel</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PwaDocumentManager({ data }: { data: PortalData }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const fileByType = useMemo(() => new Map(data.documentFiles.map((file) => [file.documentTypeId, file])), [data.documentFiles]);
  const assignedTypes = new Set(pending.map((item) => item.documentTypeId).filter(Boolean));
  const submissionLocked = data.submission?.status === "approved_green" || (data.submission?.status as string | undefined) === "approved";

  const appendFiles = (files: File[]) => {
    setPending((current) => [
      ...current,
      ...files.map((file) => {
        const normalized = file.name.toLowerCase().replace(/[^a-z0-9]+/g, " ");
        const suggestion = data.requiredTemplates.find((template) =>
          normalized.includes(template.name.toLowerCase().replace(/[^a-z0-9]+/g, " ")),
        );
        return { id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file, documentTypeId: suggestion?.id ?? "" };
      }),
    ]);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    appendFiles(Array.from(event.dataTransfer.files));
  };

  const submit = async (mode: "draft" | "review") => {
    if (!pending.length) {
      toast({ title: "Select files first", description: "Choose the documents you want to upload.", variant: "destructive" });
      return;
    }
    if (submissionLocked) {
      toast({ title: "Submission locked", description: "Approved document submissions can no longer be changed.", variant: "destructive" });
      return;
    }
    const selectedTypes = pending.map((item) => item.documentTypeId);
    if (selectedTypes.some((item) => !item) || new Set(selectedTypes).size !== selectedTypes.length) {
      toast({ title: "Assign every file", description: "Each file needs one unique document type.", variant: "destructive" });
      return;
    }
    for (const item of pending) {
      const existing = fileByType.get(item.documentTypeId);
      if (existing && approvedStatuses.has(existing.adminStatus)) {
        toast({ title: "Approved document locked", description: "Approved documents cannot be replaced.", variant: "destructive" });
        return;
      }
      if (existing && correctionStatuses.has(existing.adminStatus)) {
        toast({ title: "Use the document details page", description: "Reviewed documents must be corrected one at a time.", variant: "destructive" });
        return;
      }
      const issue = await validateOrganizationDocumentFile(item.documentTypeId, item.file);
      if (issue) {
        toast({ title: "Unsupported file", description: issue, variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      const result = await submitOrganizationDocumentsBatchToSupabase({
        submitMode: mode,
        documents: pending.map((item) => {
          const template = data.requiredTemplates.find((entry) => entry.id === item.documentTypeId)!;
          return {
            documentTypeId: template.id,
            documentTypeName: template.name,
            file: item.file,
            validationStatus: "correct",
            adminRemarks: mode === "draft" ? "Saved as draft." : "Awaiting admin review.",
          };
        }),
      });
      await data.refresh();
      if (result.failureCount) {
        toast({ title: `${result.successCount} uploaded, ${result.failureCount} failed`, description: result.results.find((item) => !item.success)?.error || "Review the failed files.", variant: "destructive" });
      } else {
        toast({ title: mode === "draft" ? "Drafts saved" : "Documents submitted", description: `${result.successCount} document${result.successCount === 1 ? "" : "s"} uploaded successfully.` });
        setPending([]);
      }
    } catch (error) {
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeExisting = async (file: SubmissionFile) => {
    if (submissionLocked || approvedStatuses.has(file.adminStatus)) return;
    try {
      await removeOrganizationDocumentFromSupabase(file.id);
      await data.refresh();
      toast({ title: "Document removed" });
    } catch (error) {
      toast({ title: "Remove failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };

  const downloadAll = async () => {
    const available = data.requiredTemplates.filter((item) => item.templateFileUrl);
    if (available.length !== data.requiredTemplates.length) {
      toast({ title: "Some templates are unavailable", description: "All required templates need a file before a ZIP can be prepared.", variant: "destructive" });
      return;
    }
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      await Promise.all(available.map(async (template) => {
        const resolved = await resolveSupabaseFileUrl(template.templateFileUrl);
        const response = await fetch(resolved);
        if (!response.ok) throw new Error(`Unable to download ${template.name}.`);
        zip.file(template.templateFileName || `${template.name}.pdf`, await response.blob());
      }));
      saveBlob(await zip.generateAsync({ type: "blob" }), "Y-TRACE-Required-Templates.zip");
    } catch (error) {
      toast({ title: "ZIP download failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="pwa-stack">
      <PwaBackButton fallback={PWA_ROUTES.documents} label="Documents" />
      <section className="pwa-card pwa-workspace-intro">
        <h2>Bulk document workspace</h2>
        <p>Select several files, then assign each one to a unique required document type.</p>
      </section>
      <div
        className="pwa-upload-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <UploadCloud aria-hidden="true" />
        <strong>Select or drop files</strong>
        <small>PDF files; the members list also accepts XLS/XLSX.</small>
        <input ref={inputRef} type="file" multiple accept=".pdf,.xls,.xlsx,application/pdf" onChange={(event) => {
          appendFiles(Array.from(event.target.files ?? []));
          event.currentTarget.value = "";
        }} />
      </div>

      {pending.length ? (
        <section className="pwa-stack" aria-label="Selected files">
          {pending.map((item) => (
            <article className="pwa-card pwa-pending-file" key={item.id}>
              <div><FileText /><span><strong>{item.file.name}</strong><small>{Math.max(1, Math.round(item.file.size / 1024))} KB</small></span></div>
              <label>
                Document type
                <select
                  value={item.documentTypeId}
                  onChange={(event) => setPending((current) => current.map((entry) => entry.id === item.id ? { ...entry, documentTypeId: event.target.value } : entry))}
                >
                  <option value="">Select a document type</option>
                  {data.requiredTemplates.map((template) => {
                    const existing = fileByType.get(template.id);
                    const locked = submissionLocked || Boolean(existing && (approvedStatuses.has(existing.adminStatus) || correctionStatuses.has(existing.adminStatus)));
                    return <option key={template.id} value={template.id} disabled={locked || (assignedTypes.has(template.id) && item.documentTypeId !== template.id)}>{template.name}{locked ? " (Locked)" : ""}</option>;
                  })}
                </select>
              </label>
              <button type="button" className="pwa-text-button is-danger" onClick={() => setPending((current) => current.filter((entry) => entry.id !== item.id))}><Trash2 /> Remove</button>
            </article>
          ))}
        </section>
      ) : null}

      <section className="pwa-card pwa-manage-list">
        <div className="pwa-inline-heading"><strong>Required documents</strong><button type="button" onClick={() => void downloadAll()} disabled={downloadingZip}><FileArchive /> {downloadingZip ? "Preparing..." : "Download ZIP"}</button></div>
        {data.requiredTemplates.map((template) => {
          const file = fileByType.get(template.id);
          return (
            <article key={template.id}>
              <div className="pwa-manage-copy"><strong>{template.name}</strong><small>{file?.fileName || "No file uploaded"}</small>{file ? <StatusBadge status={file.adminStatus} /> : null}{file?.adminRemarks ? <p>{file.adminRemarks}</p> : null}</div>
              <div className="pwa-manage-actions">
                {template.templateFileUrl ? <button type="button" aria-label={`Download ${template.name} template`} onClick={() => void downloadReference(template.templateFileUrl, template.templateFileName || `${template.name}.pdf`)}><Download /></button> : null}
                {file?.fileUrl ? <button type="button" aria-label={`View ${template.name}`} onClick={() => void resolveSupabaseFileUrl(file.fileUrl).then((url) => window.open(url, "_blank", "noopener,noreferrer"))}><Eye /></button> : null}
                {file && !submissionLocked && !approvedStatuses.has(file.adminStatus) && !correctionStatuses.has(file.adminStatus) ? <button type="button" aria-label={`Remove ${template.name}`} onClick={() => void removeExisting(file)}><Trash2 /></button> : null}
              </div>
            </article>
          );
        })}
      </section>

      <div className="pwa-sticky-actions">
        <button type="button" className="pwa-secondary-button" disabled={saving || !pending.length} onClick={() => void submit("draft")}>{saving ? <Loader2 className="pwa-spin" /> : null} Save as Draft</button>
        <button type="button" className="pwa-primary-button" disabled={saving || !pending.length} onClick={() => void submit("review")}>{saving ? <Loader2 className="pwa-spin" /> : null} Submit Selected Files</button>
      </div>
    </div>
  );
}
