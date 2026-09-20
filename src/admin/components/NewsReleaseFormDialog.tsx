import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { format, parse, setMonth, setYear } from "date-fns";
import { useNavigation, type CaptionProps } from "react-day-picker";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileImage,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  UploadCloud,
  X,
  Loader2,
  Trash2,
} from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  deriveNewsCategories,
  getNewsCategoryUsage,
  buildAdminNewsCategoryOptions,
  validateFacebookPostUrl,
  validateNewCategory,
  type NewsRelease,
  type NewsCategoryRecord,
} from "@/lib/lydo-connect-data";

const FIELD_CLASS =
  "flex h-9 w-full items-center gap-1.5 rounded-md border border-slate-300 bg-admin-surface px-2.5 py-2 font-segoe text-[13px] font-normal leading-[140%] text-text-default outline-none transition-colors placeholder:text-text-disabled focus-visible:border-public-bg-brand focus-visible:ring-2 focus-visible:ring-public-bg-brand/20";

const FIELD_ERROR_CLASS =
  "border-icon-danger-secondary focus-visible:border-icon-danger-secondary focus-visible:ring-icon-danger-secondary/20";

const VISIBILITY_OPTIONS: { value: NewsRelease["visibilityStatus"]; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const CalendarCaption = ({ displayMonth }: CaptionProps) => {
  const { goToMonth, previousMonth, nextMonth } = useNavigation();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);

  return (
    <div className="flex items-center justify-between pb-2">
      <button
        type="button"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-default transition-colors hover:bg-neutral-hover-subtle active:scale-95 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.6} />
      </button>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 font-segoe text-sm font-normal leading-none text-text-default transition-colors hover:text-public-bg-brand active:scale-95"
            >
              {MONTH_NAMES[displayMonth.getMonth()]}
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-disabled" strokeWidth={1.6} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="max-h-[240px] overflow-y-auto border-gray-200 p-1 shadow-md"
            onWheel={(event) => {
              event.currentTarget.scrollTop += event.deltaY;
            }}
          >
            {MONTH_NAMES.map((monthName, index) => (
              <DropdownMenuItem
                key={monthName}
                className={cn(
                  "cursor-pointer",
                  index === displayMonth.getMonth() && "font-semibold text-public-bg-brand",
                )}
                onClick={() => goToMonth(setMonth(displayMonth, index))}
              >
                {monthName}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 font-segoe text-sm font-normal leading-none text-text-default transition-colors hover:text-public-bg-brand active:scale-95"
            >
              {displayMonth.getFullYear()}
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-disabled" strokeWidth={1.6} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="max-h-[240px] overflow-y-auto border-gray-200 p-1 shadow-md"
            onWheel={(event) => {
              event.currentTarget.scrollTop += event.deltaY;
            }}
          >
            {years.map((year) => (
              <DropdownMenuItem
                key={year}
                className={cn(
                  "cursor-pointer",
                  year === displayMonth.getFullYear() && "font-semibold text-public-bg-brand",
                )}
                onClick={() => goToMonth(setYear(displayMonth, year))}
              >
                {year}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        type="button"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-default transition-colors hover:bg-neutral-hover-subtle active:scale-95 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.6} />
      </button>
    </div>
  );
};

const SectionHeader = ({ step, title }: { step: number; title: string }) => (
  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-public-bg-secondary-100 font-segoe text-[11px] font-bold text-public-text-brand-secondary">
      {step}
    </span>
    <h3 className="font-segoe text-xs font-bold uppercase tracking-wider text-slate-700">
      {title}
    </h3>
  </div>
);

const Label = ({
  children,
  required,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
}) => (
  <label
    htmlFor={htmlFor}
    className="flex items-center gap-1 font-segoe text-[13px] font-medium leading-none text-text-default"
  >
    {children}
    {required ? (
      <span className="text-icon-danger-secondary" aria-hidden="true">
        *
      </span>
    ) : null}
  </label>
);

export type NewsReleaseFormDialogProps = {
  mode: "create" | "edit" | null;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categoryOptions?: string[];
  categories?: NewsCategoryRecord[];
  allNewsReleases?: Array<Pick<NewsRelease, "category">>;
  onAddCategory?: (newCategory: string) => Promise<string | void> | void;
  onDeleteCategory?: (category: NewsCategoryRecord) => Promise<boolean | void> | void;
  facebookPostUrl: string;
  onFacebookPostUrlChange: (value: string) => void;
  previewImageUrl: string;
  onPreviewImageUrlChange?: (value: string) => void;
  previewImageFile: File | null;
  onPreviewImageFileChange: (file: File | null) => void;
  datePosted: string;
  onDatePostedChange: (value: string) => void;
  visibility: NewsRelease["visibilityStatus"];
  onVisibilityChange: (value: NewsRelease["visibilityStatus"]) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export const NewsReleaseFormDialog = ({
  mode,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  category,
  onCategoryChange,
  categoryOptions = [],
  categories,
  allNewsReleases = [],
  onAddCategory,
  onDeleteCategory,
  facebookPostUrl,
  onFacebookPostUrlChange,
  previewImageUrl,
  previewImageFile,
  onPreviewImageFileChange,
  datePosted,
  onDatePostedChange,
  visibility,
  onVisibilityChange,
  saving,
  onCancel,
  onSave,
}: NewsReleaseFormDialogProps) => {
  const titleInputId = useId();
  const descriptionInputId = useId();
  const facebookInputId = useId();
  const fileInputId = useId();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  const [dateOpen, setDateOpen] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Local state for adding a new category
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingCategorySubmitting, setIsAddingCategorySubmitting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);
  const [localCategories, setLocalCategories] = useState<string[]>([]);

  // Category deletion state
  const [categoryToDelete, setCategoryToDelete] = useState<NewsCategoryRecord | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [deleteCategoryError, setDeleteCategoryError] = useState<string | null>(null);

  // Validation submission state
  const [submitted, setSubmitted] = useState(false);

  // Sync available categories using persistent registry or fallback options
  const resolvedCategories = useMemo<NewsCategoryRecord[]>(() => {
    if (categories && categories.length > 0) {
      return buildAdminNewsCategoryOptions(categories, allNewsReleases);
    }
    const stringList = deriveNewsCategories(
      categoryOptions.map((c) => ({ category: c })),
      localCategories,
    );
    return stringList.map((name) => {
      const isSys = ["yorp", "ypop", "move"].includes(name.trim().toLowerCase());
      return {
        id: `cat-${name.toLowerCase().replace(/\s+/g, "_")}`,
        name,
        normalizedName: name.trim().toLowerCase().replace(/\s+/g, " "),
        isSystem: isSys,
      };
    });
  }, [categories, categoryOptions, allNewsReleases, localCategories]);

  const availableCategoryNames = useMemo(
    () => resolvedCategories.map((c) => c.name),
    [resolvedCategories],
  );

  // Handle preview object URL cleanup
  useEffect(() => {
    if (!previewImageFile) {
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(previewImageFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewImageFile]);

  // Reset local transient state on dialog open/mode change
  useEffect(() => {
    if (mode) {
      setSubmitted(false);
      setImageError(null);
      setIsAddingCategory(false);
      setNewCategoryName("");
      setNewCategoryError(null);
    }
  }, [mode]);

  const parsedDate = datePosted ? parse(datePosted, "yyyy-MM-dd", new Date()) : undefined;
  const isValidDate = Boolean(parsedDate && !Number.isNaN(parsedDate.getTime()));

  // Active thumbnail to display
  const hasExistingThumbnail = mode === "edit" && Boolean(previewImageUrl?.trim());
  const hasSelectedNewFile = Boolean(previewImageFile && filePreviewUrl);
  const resolvedThumbnailSrc = filePreviewUrl || (previewImageUrl?.trim() ? previewImageUrl.trim() : null);

  // Real-time Facebook validation
  const facebookValidation = useMemo(() => {
    if (!facebookPostUrl.trim()) {
      return { isValid: false, error: submitted ? "Facebook post URL is required." : undefined };
    }
    return validateFacebookPostUrl(facebookPostUrl);
  }, [facebookPostUrl, submitted]);

  // Field validation checks
  const titleError = submitted && !title.trim() ? "News release title is required." : undefined;
  const descriptionError = submitted && !description.trim() ? "News release description is required." : undefined;
  const categoryError = submitted && !category.trim() ? "Category is required." : undefined;
  const thumbnailError =
    submitted && !previewImageFile && (!hasExistingThumbnail || !previewImageUrl.trim())
      ? "Thumbnail image is required. Please upload an image."
      : imageError;
  const dateError = submitted && (!datePosted || !isValidDate) ? "A valid publication date is required." : undefined;

  // File validation and handling
  const handleFileSelected = (file: File | null) => {
    setImageError(null);
    if (!file) {
      onPreviewImageFileChange(null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Please choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size <= 0 || file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError("The thumbnail image must be smaller than 5 MB.");
      return;
    }

    onPreviewImageFileChange(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleFileSelected(file);
  };

  // Add new category
  const handleConfirmAddCategory = async () => {
    const result = validateNewCategory(newCategoryName, availableCategoryNames);
    if (!result.isValid) {
      setNewCategoryError(result.error || "Invalid category name.");
      return;
    }

    const createdName = result.normalizedName;
    setIsAddingCategorySubmitting(true);
    setNewCategoryError(null);
    try {
      if (onAddCategory) {
        await onAddCategory(createdName);
      } else {
        setLocalCategories((prev) => [...prev, createdName]);
      }
      onCategoryChange(createdName);
      setIsAddingCategory(false);
      setNewCategoryName("");
      setNewCategoryError(null);
    } catch (err: any) {
      setNewCategoryError(err.message || "Failed to create category.");
    } finally {
      setIsAddingCategorySubmitting(false);
    }
  };

  const handleCancelAddCategory = () => {
    setIsAddingCategory(false);
    setNewCategoryName("");
    setNewCategoryError(null);
  };

  // Form submission gate
  const handleSubmit = () => {
    setSubmitted(true);

    const isTitleValid = Boolean(title.trim());
    const isDescriptionValid = Boolean(description.trim());
    const isFacebookValid = validateFacebookPostUrl(facebookPostUrl).isValid;
    const isCategoryValid = Boolean(category.trim());
    const isThumbnailValid = Boolean(previewImageFile || (mode === "edit" && previewImageUrl.trim()));
    const isDateValid = Boolean(datePosted && isValidDate);

    if (
      !isTitleValid ||
      !isDescriptionValid ||
      !isFacebookValid ||
      !isCategoryValid ||
      !isThumbnailValid ||
      !isDateValid
    ) {
      return;
    }

    onSave();
  };

  return (
    <>
      <Dialog open={mode === "create" || mode === "edit"} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <DialogContent
        hideCloseButton
        className="flex w-[620px] sm:w-[620px] max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-y-auto rounded-lg border border-gray-200 bg-admin-surface p-4 sm:p-6 shadow-xl"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-public-bg-secondary-100 p-2 text-public-text-brand-secondary shadow-xs">
              <Pencil className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="font-segoe text-lg font-semibold leading-tight text-text-default">
                {mode === "edit" ? "Edit News Release" : "Add News Release"}
              </DialogTitle>
              <DialogDescription className="font-segoe text-xs text-slate-500">
                {mode === "edit"
                  ? "Update an existing announcement for the Organization Portal."
                  : "Create a new announcement for the Organization Portal."}
              </DialogDescription>
            </div>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              onClick={onCancel}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:scale-95"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </DialogClose>
        </div>

        {/* Form Body - 5 Clear Sections */}
        <div className="flex flex-col gap-4">
          {/* SECTION 1: CONTENT */}
          <section className="flex flex-col gap-3.5 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <SectionHeader step={1} title="Content" />

            <div className="flex flex-col gap-1.5">
              <Label required htmlFor={titleInputId}>
                Title
              </Label>
              <input
                id={titleInputId}
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Enter the news release title"
                aria-invalid={Boolean(titleError)}
                className={cn(FIELD_CLASS, titleError && FIELD_ERROR_CLASS)}
              />
              {titleError ? (
                <p className="flex items-center gap-1 font-segoe text-xs text-icon-danger-secondary" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{titleError}</span>
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label required htmlFor={descriptionInputId}>
                Description
              </Label>
              <textarea
                id={descriptionInputId}
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="Enter a brief description of the news release"
                rows={3}
                aria-invalid={Boolean(descriptionError)}
                className={cn(
                  "w-full resize-none rounded-md border border-slate-300 bg-admin-surface px-2.5 py-2 font-segoe text-[13px] font-normal leading-[140%] text-text-default outline-none transition-colors placeholder:text-text-disabled focus-visible:border-public-bg-brand focus-visible:ring-2 focus-visible:ring-public-bg-brand/20",
                  descriptionError && FIELD_ERROR_CLASS,
                )}
              />
              {descriptionError ? (
                <p className="flex items-center gap-1 font-segoe text-xs text-icon-danger-secondary" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{descriptionError}</span>
                </p>
              ) : null}
            </div>
          </section>

          {/* SECTION 2: FACEBOOK POST */}
          <section className="flex flex-col gap-3.5 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <SectionHeader step={2} title="Facebook Post" />

            <div className="flex flex-col gap-1.5">
              <Label required htmlFor={facebookInputId}>
                Facebook Post URL
              </Label>
              <div className="relative flex items-center">
                <input
                  id={facebookInputId}
                  value={facebookPostUrl}
                  onChange={(event) => onFacebookPostUrlChange(event.target.value)}
                  placeholder="https://www.facebook.com/posts/..."
                  aria-invalid={Boolean(facebookPostUrl.trim() && !facebookValidation.isValid)}
                  className={cn(
                    FIELD_CLASS,
                    facebookPostUrl.trim() && !facebookValidation.isValid && FIELD_ERROR_CLASS,
                    facebookPostUrl.trim() && facebookValidation.isValid && "border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20",
                  )}
                />
                {facebookPostUrl.trim() ? (
                  <div className="pointer-events-none absolute right-2.5 flex items-center">
                    {facebookValidation.isValid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-icon-danger-secondary" />
                    )}
                  </div>
                ) : null}
              </div>

              {/* Validation feedback */}
              {facebookPostUrl.trim() && !facebookValidation.isValid ? (
                <p className="flex items-center gap-1 font-segoe text-xs text-icon-danger-secondary" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{facebookValidation.error}</span>
                </p>
              ) : facebookPostUrl.trim() && facebookValidation.isValid ? (
                <p className="flex items-center gap-1 font-segoe text-xs text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Supported Facebook post format detected.</span>
                </p>
              ) : submitted && !facebookPostUrl.trim() ? (
                <p className="flex items-center gap-1 font-segoe text-xs text-icon-danger-secondary" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Facebook post URL is required.</span>
                </p>
              ) : (
                <p className="font-segoe text-[11px] text-slate-500">
                  Link directly to the official Facebook post, video, photo, or share permalink.
                </p>
              )}
            </div>
          </section>

          {/* SECTION 3: THUMBNAIL IMAGE */}
          <section className="flex flex-col gap-3.5 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <SectionHeader step={3} title="Thumbnail Image" />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label required>Thumbnail Image File</Label>
                <span className="font-segoe text-[11px] text-slate-500">JPG, PNG, or WebP · Max 5 MB</span>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Upload thumbnail image"
                onChange={(event) => handleFileSelected(event.target.files?.[0] ?? null)}
                className="sr-only"
              />

              {/* Display Area: Upload Box vs Image Preview */}
              {resolvedThumbnailSrc ? (
                <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="relative aspect-video w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                    <img
                      src={resolvedThumbnailSrc}
                      alt="News release thumbnail preview"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    {hasSelectedNewFile ? (
                      <div className="absolute top-2 left-2 rounded bg-public-bg-brand/90 px-2 py-0.5 font-segoe text-[11px] font-medium text-white shadow-xs">
                        New image selected
                      </div>
                    ) : hasExistingThumbnail ? (
                      <div className="absolute top-2 left-2 rounded bg-slate-800/80 px-2 py-0.5 font-segoe text-[11px] font-medium text-white shadow-xs">
                        Current saved thumbnail
                      </div>
                    ) : null}
                  </div>

                  {/* Actions & info row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <FileImage className="h-4 w-4 shrink-0 text-public-bg-brand" />
                      <span className="max-w-[220px] truncate font-segoe text-xs font-medium">
                        {previewImageFile ? previewImageFile.name : "Saved image"}
                      </span>
                      {previewImageFile ? (
                        <span className="font-segoe text-[11px] text-slate-500">
                          ({formatFileSize(previewImageFile.size)})
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      {hasSelectedNewFile && hasExistingThumbnail ? (
                        <button
                          type="button"
                          onClick={() => {
                            onPreviewImageFileChange(null);
                            setImageError(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 font-segoe text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 active:scale-95"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Revert</span>
                        </button>
                      ) : hasSelectedNewFile && !hasExistingThumbnail ? (
                        <button
                          type="button"
                          onClick={() => {
                            onPreviewImageFileChange(null);
                            setImageError(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 font-segoe text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 active:scale-95"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 font-segoe text-xs font-medium text-text-default shadow-2xs transition-colors hover:border-slate-400 hover:bg-slate-50 active:scale-95"
                      >
                        <UploadCloud className="h-3.5 w-3.5 text-public-bg-brand" />
                        <span>{hasSelectedNewFile || hasExistingThumbnail ? "Replace image" : "Upload image"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="Upload Image"
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors outline-none focus-visible:border-public-bg-brand focus-visible:ring-2 focus-visible:ring-public-bg-brand/20",
                    dragOver
                      ? "border-public-bg-brand bg-public-bg-secondary-100/30"
                      : thumbnailError
                        ? "border-icon-danger-secondary bg-rose-50/40"
                        : "border-slate-300 bg-slate-50 hover:border-public-bg-brand/60 hover:bg-slate-100/60",
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-public-bg-brand shadow-xs">
                    <UploadCloud className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-segoe text-xs font-semibold text-text-default">
                      Click to browse or drag and drop image
                    </span>
                    <span className="font-segoe text-[11px] text-slate-500">
                      Thumbnail must be uploaded directly (JPG, PNG, WebP up to 5 MB)
                    </span>
                  </div>
                </div>
              )}

              {/* Image Error Alert */}
              {thumbnailError ? (
                <p className="flex items-center gap-1 font-segoe text-xs text-icon-danger-secondary" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{thumbnailError}</span>
                </p>
              ) : null}
            </div>
          </section>

          {/* SECTION 4: CATEGORY */}
          <section className="flex flex-col gap-3.5 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <SectionHeader step={4} title="Category" />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label required>Category</Label>
                {!isAddingCategory ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(true);
                      setTimeout(() => newCategoryInputRef.current?.focus(), 50);
                    }}
                    className="flex items-center gap-1 font-segoe text-xs font-semibold text-public-bg-brand hover:underline active:scale-95 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add new category</span>
                  </button>
                ) : null}
              </div>

              {/* Selector and inline Add Category */}
              <div className="flex flex-col gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        FIELD_CLASS,
                        "justify-between cursor-pointer",
                        categoryError && FIELD_ERROR_CLASS,
                      )}
                    >
                      <span className={category ? "font-medium text-text-default" : "text-text-disabled"}>
                        {category || "Select category"}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-[--radix-dropdown-menu-trigger-width] border-slate-200 p-1 shadow-lg max-h-72 overflow-y-auto"
                  >
                    {resolvedCategories.map((option) => {
                      const isSelected = category === option.name;
                      const usageCount = allNewsReleases.length
                        ? getNewsCategoryUsage(option.normalizedName || option.name, allNewsReleases)
                        : 0;
                      const isDeletable = !option.isSystem && usageCount === 0;

                      return (
                        <DropdownMenuItem
                          key={option.id || option.normalizedName || option.name}
                          className={cn(
                            "group/item flex cursor-pointer items-center justify-between font-segoe text-xs py-1.5",
                            isSelected && "font-semibold text-public-bg-brand bg-slate-50",
                          )}
                          onClick={() => {
                            onCategoryChange(option.name);
                            setIsAddingCategory(false);
                          }}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="truncate">{option.name}</span>
                            {!option.isSystem && usageCount > 0 ? (
                              <span className="text-[10px] text-slate-400 font-normal shrink-0">
                                ({usageCount})
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {isSelected ? <Check className="h-3.5 w-3.5 text-public-bg-brand" /> : null}

                            {!option.isSystem && onDeleteCategory ? (
                              isDeletable ? (
                                <button
                                  type="button"
                                  title={`Delete category “${option.name}”`}
                                  aria-label={`Delete category ${option.name}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteCategoryError(null);
                                    setCategoryToDelete(option);
                                  }}
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded p-0.5 text-slate-400 opacity-60 transition-all hover:bg-rose-50 hover:text-rose-600 hover:opacity-100 focus:opacity-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} />
                                </button>
                              ) : (
                                <span
                                  title={`Category is in use by ${usageCount} news release(s)`}
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded p-0.5 text-slate-300 cursor-not-allowed opacity-40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} />
                                </span>
                              )
                            ) : null}
                          </div>
                        </DropdownMenuItem>
                      );
                    })}

                    <DropdownMenuSeparator className="bg-slate-200" />

                    <DropdownMenuItem
                      className="cursor-pointer font-segoe text-xs font-medium text-public-bg-brand hover:bg-public-bg-secondary-100"
                      onClick={() => {
                        setIsAddingCategory(true);
                        setTimeout(() => newCategoryInputRef.current?.focus(), 50);
                      }}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      <span>Add new category...</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Inline Add Category Sub-Form */}
                {isAddingCategory ? (
                  <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="font-segoe text-xs font-semibold text-slate-700">Add New Category</span>
                      <button
                        type="button"
                        onClick={handleCancelAddCategory}
                        className="text-slate-400 hover:text-slate-600"
                        aria-label="Cancel adding category"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={newCategoryInputRef}
                        value={newCategoryName}
                        disabled={isAddingCategorySubmitting}
                        onChange={(event) => {
                          setNewCategoryName(event.target.value);
                          setNewCategoryError(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleConfirmAddCategory();
                          } else if (event.key === "Escape") {
                            handleCancelAddCategory();
                          }
                        }}
                        placeholder="e.g. Community Outreach"
                        className={cn(
                          "h-8 flex-1 rounded-md border border-slate-300 bg-white px-2.5 font-segoe text-xs outline-none focus-visible:border-public-bg-brand focus-visible:ring-1 focus-visible:ring-public-bg-brand",
                          newCategoryError && "border-icon-danger-secondary",
                        )}
                      />
                      <button
                        type="button"
                        disabled={isAddingCategorySubmitting}
                        onClick={() => void handleConfirmAddCategory()}
                        className="h-8 rounded-md bg-public-bg-brand px-3 font-segoe text-xs font-medium text-white transition-colors hover:bg-bg-brand-hover active:scale-95 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {isAddingCategorySubmitting ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Adding…</span>
                          </>
                        ) : (
                          "Add"
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isAddingCategorySubmitting}
                        onClick={handleCancelAddCategory}
                        className="h-8 rounded-md border border-slate-300 bg-white px-2.5 font-segoe text-xs text-slate-600 hover:bg-slate-100 active:scale-95"
                      >
                        Cancel
                      </button>
                    </div>

                    {newCategoryError ? (
                      <p className="font-segoe text-[11px] text-icon-danger-secondary" role="alert">
                        {newCategoryError}
                      </p>
                    ) : (
                      <p className="font-segoe text-[11px] text-slate-500">
                        New category will be immediately selected and persisted in the category registry.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              {categoryError ? (
                <p className="flex items-center gap-1 font-segoe text-xs text-icon-danger-secondary" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{categoryError}</span>
                </p>
              ) : (
                <p className="font-segoe text-[11px] text-slate-500">
                  Required category tag shown on public news release cards and admin filters.
                </p>
              )}
            </div>
          </section>

          {/* SECTION 5: PUBLISHING */}
          <section className="flex flex-col gap-3.5 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <SectionHeader step={5} title="Publishing" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Publish Date */}
              <div className="flex flex-col gap-1.5">
                <Label required>Publish Date</Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(FIELD_CLASS, "justify-between", dateError && FIELD_ERROR_CLASS)}
                    >
                      <span>{isValidDate ? format(parsedDate!, "dd/MM/yyyy") : "Select date"}</span>
                      <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.6} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto rounded-md border border-slate-200 p-4 shadow-lg">
                    <Calendar
                      mode="single"
                      selected={isValidDate ? parsedDate : undefined}
                      onSelect={(date) => {
                        if (date) {
                          onDatePostedChange(format(date, "yyyy-MM-dd"));
                          setDateOpen(false);
                        }
                      }}
                      components={{ Caption: CalendarCaption }}
                      classNames={{
                        day_selected:
                          "bg-public-bg-brand text-public-text-neutral-on-neutral hover:bg-public-bg-brand hover:text-public-text-neutral-on-neutral focus:bg-public-bg-brand focus:text-public-text-neutral-on-neutral font-segoe text-public-fs-subheading-sm leading-none text-center",
                      }}
                    />
                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          onDatePostedChange("");
                          setDateOpen(false);
                        }}
                        className="font-segoe text-xs text-slate-500 hover:text-slate-800"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDatePostedChange(format(new Date(), "yyyy-MM-dd"));
                          setDateOpen(false);
                        }}
                        className="font-segoe text-xs font-semibold text-public-bg-brand hover:underline"
                      >
                        Today
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
                {dateError ? (
                  <p className="flex items-center gap-1 font-segoe text-xs text-icon-danger-secondary" role="alert">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{dateError}</span>
                  </p>
                ) : null}
              </div>

              {/* Visibility Status */}
              <div className="flex flex-col gap-1.5">
                <Label required>Initial Status</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className={cn(FIELD_CLASS, "justify-between")}>
                      <span className={visibility ? "text-text-default" : "text-text-disabled"}>
                        {VISIBILITY_OPTIONS.find((option) => option.value === visibility)?.label ?? "Select status"}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] border-slate-200">
                    {VISIBILITY_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        className="cursor-pointer font-segoe text-xs"
                        onClick={() => onVisibilityChange(option.value)}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="h-10 rounded-md border border-slate-300 bg-admin-surface px-4 font-segoe text-sm font-normal text-text-default transition-colors hover:border-slate-400 hover:bg-slate-50 active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex h-10 items-center gap-2 rounded-md bg-public-bg-brand px-4 font-segoe text-sm font-medium text-public-text-neutral-on-neutral shadow-sm transition-all hover:bg-bg-brand-hover active:scale-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Create News Release"}
          </button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Category Confirmation Dialog */}
    <AlertDialog
      open={Boolean(categoryToDelete)}
      onOpenChange={(open) => {
        if (!open && !isDeletingCategory) {
          setCategoryToDelete(null);
          setDeleteCategoryError(null);
        }
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-segoe text-base font-bold text-text-default">
            Delete Category
          </AlertDialogTitle>
          <AlertDialogDescription className="font-segoe text-sm text-slate-500">
            Are you sure you want to delete the category “{categoryToDelete?.name}”? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {deleteCategoryError ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 font-segoe text-xs text-rose-700" role="alert">
            {deleteCategoryError}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isDeletingCategory}
            onClick={() => {
              setCategoryToDelete(null);
              setDeleteCategoryError(null);
            }}
            className="font-segoe"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeletingCategory}
            onClick={async () => {
              if (!categoryToDelete) return;
              setIsDeletingCategory(true);
              setDeleteCategoryError(null);
              try {
                if (onDeleteCategory) {
                  await onDeleteCategory(categoryToDelete);
                }
                if (category === categoryToDelete.name) {
                  onCategoryChange("");
                }
                setCategoryToDelete(null);
              } catch (err: any) {
                setDeleteCategoryError(err.message || "Failed to delete category.");
              } finally {
                setIsDeletingCategory(false);
              }
            }}
            className="font-segoe active:scale-[0.98] transition-transform"
          >
            {isDeletingCategory ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete Category
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
