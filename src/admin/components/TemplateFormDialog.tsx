import { useRef, useState, useMemo } from "react";
import { ChevronDown, File, FileMinus, FileText, Info, Pencil, Save, Trash2, Upload, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  buildAdminTemplateCategoryOptions,
  formatCanonicalCategoryLabel,
  formatTemplateCategoryDropdownLabel,
  isSystemTemplateCategory,
  normalizeTemplateCategoryKey,
} from "@/lib/lydo-connect-data";
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

export type TemplateWorkflowScope = "registration" | "renewal" | "both" | "downloadable";

export const WORKFLOW_SCOPE_OPTIONS: Array<{
  value: TemplateWorkflowScope;
  label: string;
  description: string;
}> = [
  {
    value: "both",
    label: "Both Registration & Renewal",
    description: "Appears in both initial registration and annual renewal document checklists.",
  },
  {
    value: "registration",
    label: "Registration Requirement",
    description: "Appears exclusively in initial organization registration requirements.",
  },
  {
    value: "renewal",
    label: "Renewal Requirement",
    description: "Appears exclusively in annual re-accreditation renewal packets.",
  },
  {
    value: "downloadable",
    label: "Downloadable Template",
    description: "General downloadable resource for reference, not a required submission.",
  },
];

type TemplateFormDialogProps = {
  mode: "create" | "edit" | null;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  workflowScope?: TemplateWorkflowScope;
  onWorkflowScopeChange?: (value: TemplateWorkflowScope) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  existingFileName?: string;
  existingFileSize?: number | null;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  categoryOptions?: string[];
  onAddCategory?: (category: string) => void;
  onDeleteCategory?: (category: string) => void;
};

export const TemplateFormDialog = ({
  mode,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  category,
  onCategoryChange,
  workflowScope = "both",
  onWorkflowScopeChange,
  file,
  onFileChange,
  existingFileName,
  existingFileSize,
  saving,
  onCancel,
  onSave,
  categoryOptions,
  onAddCategory,
  onDeleteCategory,
}: TemplateFormDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);

  const displayFileName = file?.name || existingFileName || "";
  const displayFileSize = file ? file.size : existingFileSize ?? null;
  const hasFile = Boolean(displayFileName);
  const detectedFormat = hasFile ? getTemplateFileFormat(displayFileName, displayFileName) : "";
  const swatch = hasFile ? fileFormatSwatch(detectedFormat) : null;
  const SwatchIcon = swatch?.icon;

  const dynamicOptions = useMemo(() => {
    return buildAdminTemplateCategoryOptions(
      [],
      [...(categoryOptions ?? []), ...(category ? [category] : [])],
    );
  }, [categoryOptions, category]);

  const handleConfirmAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setNewCategoryError("Please enter a category name.");
      return;
    }
    const normalized = normalizeTemplateCategoryKey(trimmed);
    if (!normalized) {
      setNewCategoryError("Please enter a valid category name.");
      return;
    }
    if (isSystemTemplateCategory(normalized)) {
      setNewCategoryError(`"${formatCanonicalCategoryLabel(normalized)}" is a system category.`);
      return;
    }
    const existingNormalized = dynamicOptions.map(normalizeTemplateCategoryKey);
    if (existingNormalized.includes(normalized)) {
      setNewCategoryError(`Category "${formatCanonicalCategoryLabel(normalized)}" already exists.`);
      return;
    }

    onAddCategory?.(normalized);
    onCategoryChange(normalized);
    setIsAddingCategory(false);
    setNewCategoryName("");
    setNewCategoryError(null);
  };

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
              <DialogDescription className="font-segoe text-sm font-normal leading-none text-slate-500">
                {mode === "edit"
                  ? "Update an existing form or template for users to download and use."
                  : "Add a new form or template for users to download and use."}
              </DialogDescription>
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
            <div className="flex items-center justify-between">
              <Label>Category</Label>
              {!isAddingCategory ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(true);
                    setNewCategoryError(null);
                  }}
                  className="text-xs text-primary font-medium hover:underline cursor-pointer"
                >
                  + New category
                </button>
              ) : null}
            </div>
            {isAddingCategory ? (
              <div className="flex flex-col gap-2 rounded-md border border-slate-300 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-segoe text-xs font-semibold text-slate-700">Add New Category</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName("");
                      setNewCategoryError(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Cancel adding category"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={newCategoryName}
                    onChange={(event) => {
                      setNewCategoryName(event.target.value);
                      setNewCategoryError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleConfirmAddCategory();
                      }
                    }}
                    placeholder="e.g. Youth Development, Handbook..."
                    className={cn(FIELD_CLASS, newCategoryError && "border-rose-500")}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleConfirmAddCategory}
                    className="inline-flex h-8 items-center justify-center rounded-md bg-public-bg-brand px-3 text-xs font-semibold text-white transition-colors hover:bg-bg-brand-hover cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                {newCategoryError ? (
                  <p className="font-segoe text-xs text-rose-600">{newCategoryError}</p>
                ) : null}
              </div>
            ) : (
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
                  {dynamicOptions.map((option) => {
                    const isSystem = isSystemTemplateCategory(option);
                    return (
                      <DropdownMenuItem
                        key={option}
                        className="flex cursor-pointer items-center justify-between font-segoe text-xs"
                        onClick={() => onCategoryChange(option)}
                      >
                        <span className="truncate">{formatTemplateCategoryDropdownLabel(option)}</span>
                        {!isSystem && onDeleteCategory ? (
                          <button
                            type="button"
                            aria-label={`Delete category ${formatTemplateCategoryDropdownLabel(option)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCategory(option);
                            }}
                            className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded p-0.5 text-slate-400 opacity-70 transition-colors hover:bg-slate-100 hover:text-rose-600 hover:opacity-100 focus:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} />
                          </button>
                        ) : null}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuItem
                    className="cursor-pointer text-primary font-semibold border-t border-slate-200 mt-1 pt-1.5"
                    onClick={() => {
                      setIsAddingCategory(true);
                      setNewCategoryError(null);
                    }}
                  >
                    + Add New Category
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Workflow Scope</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={cn(FIELD_CLASS, "justify-between")}>
                  <span className="text-text-default">
                    {WORKFLOW_SCOPE_OPTIONS.find((opt) => opt.value === workflowScope)?.label || "Both Registration & Renewal"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] border-slate-300">
                {WORKFLOW_SCOPE_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    className="cursor-pointer py-2 flex flex-col items-start gap-0.5"
                    onClick={() => onWorkflowScopeChange?.(opt.value)}
                  >
                    <span className="font-medium text-xs text-text-default">{opt.label}</span>
                    <span className="text-[11px] text-muted-foreground">{opt.description}</span>
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
              required
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
