import { useRef } from "react";
import { ChevronDown, File, FileMinus, FileText, Info, Pencil, Save, Upload, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatTemplateCategoryDropdownLabel, TEMPLATE_CATEGORY_PRIORITY } from "@/lib/lydo-connect-data";
import { getTemplateFileFormat, formatFileSize } from "@/components/portal/UserPortalTemplatesWorkspaceView";

const FIELD_CLASS =
  "flex h-8 w-full items-center gap-1.5 rounded-md border border-slate-300 bg-admin-surface px-2.5 py-2 font-segoe text-[13px] font-normal leading-[140%] text-text-default outline-none placeholder:text-text-disabled";

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="flex items-center gap-1 font-segoe text-[13px] font-normal leading-none text-text-default">
    {children}
    <span className="text-icon-danger-secondary">*</span>
  </label>
);

const fileFormatSwatch = (format: string) => {
  const upper = format.toUpperCase();
  if (upper === "PDF") {
    return { icon: File, iconBg: "bg-danger-subtle", iconColor: "text-icon-danger-secondary", radius: "rounded-md" };
  }
  if (upper === "XLSX" || upper === "XLS" || upper === "CSV") {
    return { icon: FileMinus, iconBg: "bg-bg-success-subtle", iconColor: "text-positive-secondary", radius: "rounded-[14px]" };
  }
  return { icon: FileText, iconBg: "bg-public-bg-secondary-100", iconColor: "text-public-text-brand-secondary", radius: "rounded-[14px]" };
};

type TemplateFormDialogProps = {
  mode: "create" | "edit" | null;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  existingFileName?: string;
  existingFileSize?: number | null;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export const TemplateFormDialog = ({
  mode,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  category,
  onCategoryChange,
  file,
  onFileChange,
  existingFileName,
  existingFileSize,
  saving,
  onCancel,
  onSave,
}: TemplateFormDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayFileName = file?.name || existingFileName || "";
  const displayFileSize = file ? file.size : existingFileSize ?? null;
  const hasFile = Boolean(displayFileName);
  const detectedFormat = hasFile ? getTemplateFileFormat(displayFileName, displayFileName) : "";
  const swatch = hasFile ? fileFormatSwatch(detectedFormat) : null;
  const SwatchIcon = swatch?.icon;

  return (
    <Dialog open={mode === "create" || mode === "edit"} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <DialogContent
        hideCloseButton
        className="flex w-[560px] sm:w-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] flex-col gap-6 overflow-y-auto rounded-md sm:rounded-md border border-gray-200 bg-admin-surface p-6 sm:p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-public-bg-secondary-100 p-2">
              {mode === "edit" ? (
                <Pencil className="h-5 w-5 text-public-text-brand-secondary" strokeWidth={1.6} />
              ) : (
                <FileText className="h-5 w-5 text-public-text-brand-secondary" strokeWidth={1.6} />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle className="font-segoe text-lg font-semibold leading-none text-text-default">
                {mode === "edit" ? "Edit File" : "Upload File"}
              </DialogTitle>
              <p className="font-segoe text-sm font-normal leading-none text-slate-500">
                {mode === "edit"
                  ? "Update an existing form or template for users to download and use."
                  : "Add a new form or template for users to download and use."}
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="h-5 w-5 shrink-0 border-0 bg-transparent p-0 text-border-default transition-colors hover:text-public-text-secondary"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </DialogClose>
        </div>

        <div className="flex flex-col gap-4 rounded-md border border-slate-300 bg-gray-50 p-6">
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={cn(FIELD_CLASS, "justify-between")}>
                  <span className={category ? "text-text-default" : "text-text-disabled"}>
                    {category ? formatTemplateCategoryDropdownLabel(category) : "Select category"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] border-slate-300">
                {TEMPLATE_CATEGORY_PRIORITY.map((option) => (
                  <DropdownMenuItem key={option} className="cursor-pointer" onClick={() => onCategoryChange(option)}>
                    {formatTemplateCategoryDropdownLabel(option)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>File Name</Label>
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Enter the form or template name."
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Enter a brief description of the form or template."
              rows={3}
              className="w-full resize-none rounded-md border border-slate-300 bg-admin-surface px-2 py-1.5 font-segoe text-[13px] font-normal leading-[140%] text-text-default outline-none placeholder:text-text-disabled"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Attach File</Label>
            <div className="flex flex-col gap-4 rounded-md border border-dashed border-slate-300 bg-admin-surface p-4 transition-colors hover:border-public-text-brand-secondary hover:bg-slate-50">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-4 py-2"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-public-bg-secondary-100 p-2">
                  <Upload className="h-5 w-5 text-public-text-brand-secondary" strokeWidth={1.6} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="font-segoe text-[13px] font-semibold leading-[140%] text-public-bg-brand">
                    Click to browse file
                  </p>
                  <p className="font-segoe text-[11px] font-normal leading-[140%] text-slate-500">
                    Supports PDF, DOCX, and XLSX documents up to 10 MB
                  </p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              />

              {hasFile ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface p-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center p-2", swatch?.iconBg, swatch?.radius)}>
                      {SwatchIcon ? <SwatchIcon className={cn("h-5 w-5", swatch?.iconColor)} strokeWidth={1.6} /> : null}
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="truncate font-segoe text-[13px] font-semibold leading-[140%] text-public-text-neutral-default">
                        {displayFileName}
                      </p>
                      <p className="truncate font-cascadia text-[11px] font-normal leading-[140%] text-segmented-control-inactive-text">
                        {formatFileSize(displayFileSize)} · Auto-detected: {detectedFormat}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove file"
                    onClick={() => onFileChange(null)}
                    className="h-5 w-5 shrink-0 border-0 bg-transparent p-0 text-border-default shadow-none transition-colors hover:bg-transparent hover:text-public-text-secondary"
                  >
                    <X className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {mode === "create" ? (
          <div className="flex items-start gap-2.5 rounded-md border border-brand-info-border bg-brand-info-subtle p-6">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
            <p className="text-justify font-segoe text-[13px] font-normal leading-[120%] text-public-bg-brand">
              Newly uploaded forms and templates are automatically set to <span className="font-semibold">Active</span> and
              available to organization users.
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="h-11 rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-text-default transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex h-11 items-center gap-2 rounded-md bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover disabled:opacity-50"
          >
            {mode === "edit" ? (
              <Save className="h-4 w-4 shrink-0" strokeWidth={1.6} />
            ) : (
              <Upload className="h-4 w-4 shrink-0" strokeWidth={1.6} />
            )}
            {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Upload File"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
