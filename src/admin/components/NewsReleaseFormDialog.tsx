import { useEffect, useRef, useState, type ReactNode } from "react";
import { format, parse, setMonth, setYear } from "date-fns";
import { useNavigation, type CaptionProps } from "react-day-picker";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NEWS_CATEGORY_OPTIONS, type NewsRelease } from "@/lib/lydo-connect-data";

const FIELD_CLASS =
  "flex h-8 w-full items-center gap-1.5 rounded-md border border-slate-300 bg-admin-surface px-2.5 py-2 font-segoe text-[13px] font-normal leading-[140%] text-text-default outline-none placeholder:text-text-disabled";

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
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-default transition-colors hover:bg-neutral-hover-subtle disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.6} />
      </button>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 font-segoe text-sm font-normal leading-none text-text-default transition-colors hover:text-public-bg-brand"
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
              className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 font-segoe text-sm font-normal leading-none text-text-default transition-colors hover:text-public-bg-brand"
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
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-default transition-colors hover:bg-neutral-hover-subtle disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.6} />
      </button>
    </div>
  );
};

const Label = ({ children, required }: { children: ReactNode; required?: boolean }) => (
  <label className="flex items-center gap-1 font-segoe text-[13px] font-normal leading-none text-text-default">
    {children}
    {required ? <span className="text-icon-danger-secondary">*</span> : null}
  </label>
);

type NewsReleaseFormDialogProps = {
  mode: "create" | "edit" | null;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  facebookPostUrl: string;
  onFacebookPostUrlChange: (value: string) => void;
  previewImageUrl: string;
  onPreviewImageUrlChange: (value: string) => void;
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
  facebookPostUrl,
  onFacebookPostUrlChange,
  previewImageUrl,
  onPreviewImageUrlChange,
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
  const [imageInputMode, setImageInputMode] = useState<"url" | "file">("url");
  const [dateOpen, setDateOpen] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!previewImageFile) {
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(previewImageFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewImageFile]);

  const parsedDate = datePosted ? parse(datePosted, "yyyy-MM-dd", new Date()) : undefined;
  const isValidDate = Boolean(parsedDate && !Number.isNaN(parsedDate.getTime()));
  const resolvedPreviewSrc = filePreviewUrl || (previewImageUrl.trim() ? previewImageUrl.trim() : null);

  return (
    <Dialog open={mode === "create" || mode === "edit"} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <DialogContent
        hideCloseButton
        className="flex w-[560px] sm:w-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] flex-col gap-6 overflow-y-auto rounded-md sm:rounded-md border border-gray-200 bg-admin-surface p-6 sm:p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-public-bg-secondary-100 p-2">
              <Pencil className="h-5 w-5 text-public-text-brand-secondary" strokeWidth={1.6} />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle className="font-segoe text-lg font-semibold leading-none text-text-default">
                {mode === "edit" ? "Edit News Release" : "Add News Release"}
              </DialogTitle>
              <p className="font-segoe text-sm font-normal leading-none text-slate-500">
                {mode === "edit"
                  ? "Update an existing announcement for the Organization Portal."
                  : "Create a new announcement for the Organization Portal."}
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
            <Label required>Title</Label>
            <input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Enter the news release title."
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label required>Description</Label>
            <textarea
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Enter a brief description of the news release."
              rows={3}
              className="w-full resize-none rounded-md border border-slate-300 bg-admin-surface px-2 py-1.5 font-segoe text-[13px] font-normal leading-[140%] text-text-default outline-none placeholder:text-text-disabled"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label required>Category</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={cn(FIELD_CLASS, "justify-between")}>
                  <span className={category ? "text-text-default" : "text-text-disabled"}>
                    {category || "Select category"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] border-slate-300">
                {NEWS_CATEGORY_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    className="cursor-pointer"
                    onClick={() => onCategoryChange(option)}
                  >
                    {option}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="font-segoe text-[11px] font-normal leading-none text-slate-500">
              Optional tag shown on public news release cards.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label required>Facebook Post URL</Label>
            <input
              value={facebookPostUrl}
              onChange={(event) => onFacebookPostUrlChange(event.target.value)}
              placeholder="https://facebook.com/..."
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label required>Thumbnail Image</Label>
            <div className="flex h-10 w-[156px] items-center rounded-md border border-segmented-control-border bg-segmented-control-bg p-1">
              <button
                type="button"
                onClick={() => setImageInputMode("url")}
                className={cn(
                  "flex h-8 w-[70px] items-center justify-center rounded-[6px] font-segoe text-xs font-semibold leading-[140%] transition-colors",
                  imageInputMode === "url" ? "bg-admin-surface text-public-bg-brand" : "text-segmented-control-inactive-text",
                )}
              >
                Paste URL
              </button>
              <button
                type="button"
                onClick={() => setImageInputMode("file")}
                className={cn(
                  "flex h-8 w-[78px] items-center justify-center rounded-[6px] font-segoe text-xs font-semibold leading-[140%] transition-colors",
                  imageInputMode === "file" ? "bg-admin-surface text-public-bg-brand" : "text-segmented-control-inactive-text",
                )}
              >
                Upload File
              </button>
            </div>

            {imageInputMode === "url" ? (
              <input
                value={previewImageUrl}
                onChange={(event) => onPreviewImageUrlChange(event.target.value)}
                placeholder="https://example.com/thumbnail.jpg"
                className={FIELD_CLASS}
              />
            ) : (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => onPreviewImageFileChange(event.target.files?.[0] ?? null)}
                className="flex h-8 w-full items-center rounded-md border border-slate-300 bg-admin-surface font-segoe text-[13px] text-text-default file:mr-2 file:h-full file:shrink-0 file:cursor-pointer file:rounded-l-md file:border-0 file:bg-neutral-hover-subtle file:px-2.5 file:font-segoe file:text-[13px] file:text-text-default"
              />
            )}

            <p className="font-segoe text-[11px] font-normal leading-none text-slate-500">
              External image URLs may expire or prevent images from loading. Uploading an image is recommended.
            </p>

            {resolvedPreviewSrc ? (
              <img
                src={resolvedPreviewSrc}
                alt=""
                referrerPolicy="no-referrer"
                className="h-[290px] w-full rounded-md object-cover"
              />
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label required>Publish Date</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className={cn(FIELD_CLASS, "justify-between")}>
                    <span>{isValidDate ? format(parsedDate!, "dd/MM/yyyy") : "Select date"}</span>
                    <CalendarIcon className="h-4 w-4 shrink-0 text-public-text-neutral-default" strokeWidth={1.6} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto rounded-md border-0 border-t border-slate-300 p-4">
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
                  <div className="mt-2 flex items-center justify-center gap-16">
                    <button
                      type="button"
                      onClick={() => {
                        onDatePostedChange("");
                        setDateOpen(false);
                      }}
                      className="font-segoe text-sm text-public-bg-brand hover:underline"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDatePostedChange(format(new Date(), "yyyy-MM-dd"));
                        setDateOpen(false);
                      }}
                      className="font-segoe text-sm text-public-bg-brand hover:underline"
                    >
                      Today
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
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
                <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] border-slate-300">
                  {VISIBILITY_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      className="cursor-pointer"
                      onClick={() => onVisibilityChange(option.value)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

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
            <Save className="h-4 w-4 shrink-0" strokeWidth={1.6} />
            {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Create News Release"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
