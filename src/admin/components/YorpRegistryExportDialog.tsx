import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RectangleHorizontal,
  RectangleVertical,
  RotateCcw,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  PDF_PAPER_SIZE_OPTIONS,
  type ExportFormat,
  type PdfOrientation,
  type PdfPaperSize,
  type PdfPageConfig,
} from "@/lib/report-export";
import {
  DEFAULT_YORP_REGISTRY_COLUMN_KEYS,
  YORP_REGISTRY_AVAILABLE_COLUMNS,
  YORP_REGISTRY_COLUMN_GROUPS,
  YORP_REGISTRY_COLUMN_ORDER,
  YORP_REGISTRY_REQUIRED_COLUMN_KEYS,
  type YorpRegistryColumnGroupKey,
} from "@/lib/report-export-configs";

export interface YorpRegistryExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordCount?: number;
  filterSummaryLines?: string[];
  selectedSemesterLabel?: string;
  onExport: (
    format: ExportFormat,
    selectedColumnKeys: string[],
    pageConfig?: PdfPageConfig,
  ) => Promise<void> | void;
  initialPaperSize?: PdfPaperSize;
  initialOrientation?: PdfOrientation;
}

const FORMAT_CONFIGS: Record<
  ExportFormat,
  {
    title: string;
    description: string;
    icon: LucideIcon;
  }
> = {
  pdf: {
    title: "PDF Report",
    description: "Official letterhead",
    icon: FileText,
  },
  xlsx: {
    title: "Excel (.xlsx)",
    description: "Spreadsheet",
    icon: FileSpreadsheet,
  },
  csv: {
    title: "CSV File",
    description: "Raw tabular data",
    icon: Table2,
  },
};

function SectionSelectAllCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
  groupLabel,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: () => void;
  groupLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label className="inline-flex items-center gap-1.5 font-segoe text-xs font-semibold text-public-bg-brand hover:text-bg-brand-hover dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer select-none">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 dark:border-slate-600 text-public-bg-brand focus:ring-public-bg-brand accent-public-bg-brand cursor-pointer disabled:cursor-not-allowed"
        aria-label={`Select all ${groupLabel} columns`}
      />
      <span>Select all</span>
    </label>
  );
}

export function YorpRegistryExportDialog({
  open,
  onOpenChange,
  recordCount,
  filterSummaryLines = [],
  selectedSemesterLabel,
  onExport,
  initialPaperSize = "a4",
  initialOrientation = "landscape",
}: YorpRegistryExportDialogProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(DEFAULT_YORP_REGISTRY_COLUMN_KEYS);
  const [alwaysIncludeRequired, setAlwaysIncludeRequired] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [paperSize, setPaperSize] = useState<PdfPaperSize>(initialPaperSize);
  const [orientation, setOrientation] = useState<PdfOrientation>(initialOrientation);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When dialog opens, reset paper setup or state if needed
  useEffect(() => {
    if (open) {
      setIsSubmitting(false);
      setPaperSize(initialPaperSize);
      setOrientation(initialOrientation);
    }
  }, [open, initialPaperSize, initialOrientation]);

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const selectedCount = selectedKeys.length;
  const totalAvailableCount = YORP_REGISTRY_AVAILABLE_COLUMNS.length;

  const handleToggleAlwaysIncludeRequired = (checked: boolean) => {
    setAlwaysIncludeRequired(checked);
    if (checked) {
      setSelectedKeys((prev) => {
        const nextSet = new Set([...prev, ...YORP_REGISTRY_REQUIRED_COLUMN_KEYS]);
        return YORP_REGISTRY_COLUMN_ORDER.filter((k) => nextSet.has(k));
      });
    }
  };

  const handleToggleColumn = (key: string) => {
    if (alwaysIncludeRequired && YORP_REGISTRY_REQUIRED_COLUMN_KEYS.includes(key)) {
      return;
    }
    setSelectedKeys((prev) => {
      const exists = prev.includes(key);
      if (exists) {
        return prev.filter((k) => k !== key);
      }
      // Insert in logical sequence order
      const nextSet = new Set([...prev, key]);
      return YORP_REGISTRY_COLUMN_ORDER.filter((k) => nextSet.has(k));
    });
  };

  const handleToggleSection = (groupKey: YorpRegistryColumnGroupKey) => {
    const groupColumns = columnsByGroup.get(groupKey) ?? [];
    const groupKeys = groupColumns.map((col) => col.key);
    const isAllGroupSelected = groupKeys.length > 0 && groupKeys.every((k) => selectedKeySet.has(k));

    if (isAllGroupSelected) {
      // Deselect columns in this group, respecting locked required fields if active
      setSelectedKeys((prev) => {
        const keysToRemove = new Set(
          alwaysIncludeRequired
            ? groupKeys.filter((k) => !YORP_REGISTRY_REQUIRED_COLUMN_KEYS.includes(k))
            : groupKeys,
        );
        return prev.filter((k) => !keysToRemove.has(k));
      });
    } else {
      // Select all columns in this group
      setSelectedKeys((prev) => {
        const nextSet = new Set([...prev, ...groupKeys]);
        return YORP_REGISTRY_COLUMN_ORDER.filter((k) => nextSet.has(k));
      });
    }
  };

  const handleSelectAll = () => {
    setSelectedKeys([...YORP_REGISTRY_COLUMN_ORDER]);
  };

  const handleClearAll = () => {
    if (alwaysIncludeRequired) {
      setSelectedKeys(
        YORP_REGISTRY_COLUMN_ORDER.filter((k) => YORP_REGISTRY_REQUIRED_COLUMN_KEYS.includes(k)),
      );
    } else {
      setSelectedKeys([]);
    }
  };

  const handleResetDefault = () => {
    if (alwaysIncludeRequired) {
      const nextSet = new Set([
        ...DEFAULT_YORP_REGISTRY_COLUMN_KEYS,
        ...YORP_REGISTRY_REQUIRED_COLUMN_KEYS,
      ]);
      setSelectedKeys(YORP_REGISTRY_COLUMN_ORDER.filter((k) => nextSet.has(k)));
    } else {
      setSelectedKeys([...DEFAULT_YORP_REGISTRY_COLUMN_KEYS]);
    }
  };

  const handleGenerate = async () => {
    if (isSubmitting || selectedCount === 0) return;
    setIsSubmitting(true);
    try {
      // Paint the busy state before PDF/Excel/CSV generation starts.
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())),
      );

      let finalKeys = selectedKeys;
      if (alwaysIncludeRequired) {
        const nextSet = new Set([...selectedKeys, ...YORP_REGISTRY_REQUIRED_COLUMN_KEYS]);
        finalKeys = YORP_REGISTRY_COLUMN_ORDER.filter((k) => nextSet.has(k));
      }
      const pageConfig: PdfPageConfig = { paperSize, orientation };
      await onExport(selectedFormat, finalKeys, pageConfig);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPdf = selectedFormat === "pdf";

  // Group columns by category
  const columnsByGroup = useMemo(() => {
    const map = new Map<YorpRegistryColumnGroupKey, typeof YORP_REGISTRY_AVAILABLE_COLUMNS>();
    for (const group of YORP_REGISTRY_COLUMN_GROUPS) {
      map.set(
        group.key,
        YORP_REGISTRY_AVAILABLE_COLUMNS.filter((col) => col.group === group.key),
      );
    }
    return map;
  }, []);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
      <DialogContent
        hideCloseButton
        className="flex w-full max-w-[600px] max-h-[calc(100dvh-2.5rem)] sm:max-h-[86vh] flex-col p-0 overflow-hidden rounded-xl border border-slate-300 dark:border-slate-800 bg-admin-surface shadow-2xl"
      >
        {/* Fixed Header */}
        <div className="flex items-center gap-3 border-b border-slate-200/90 dark:border-slate-800 px-5 py-3.5 shrink-0 bg-admin-surface dark:bg-slate-900/60">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-public-bg-secondary-100 dark:bg-sky-950/60 p-2">
            <Download className="h-4.5 w-4.5 text-public-text-brand-secondary" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="font-segoe text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
              Export YORP Registry
            </DialogTitle>
            <DialogDescription className="font-segoe text-xs font-normal text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
              Choose the information you want included in your export.
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Semester & Scope Info Banner */}
          {selectedSemesterLabel && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="font-segoe text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Semester:
                </span>
                <span className="font-segoe text-xs font-bold text-slate-900 dark:text-slate-100">
                  {selectedSemesterLabel}
                </span>
              </div>
              {typeof recordCount === "number" && (
                <span className="font-segoe text-xs font-medium text-slate-500 dark:text-slate-400">
                  {recordCount} record{recordCount === 1 ? "" : "s"} matching
                </span>
              )}
            </div>
          )}

          {/* Column Selection Toolbar & Controls */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <label className="font-segoe text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Select Columns
                </label>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 font-segoe text-xs font-semibold leading-none border transition-colors",
                    selectedCount > 0
                      ? "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60"
                      : "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900/60",
                  )}
                >
                  {selectedCount} of {totalAvailableCount} selected
                </span>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1 font-segoe text-xs">
                <button
                  type="button"
                  disabled={isSubmitting || selectedCount === totalAvailableCount}
                  onClick={handleSelectAll}
                  className="rounded px-2 py-0.5 font-semibold text-public-bg-brand transition-colors hover:bg-sky-50 dark:hover:bg-sky-950/50 active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  Select all
                </button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <button
                  type="button"
                  disabled={
                    isSubmitting ||
                    (alwaysIncludeRequired
                      ? selectedCount === YORP_REGISTRY_REQUIRED_COLUMN_KEYS.length &&
                        YORP_REGISTRY_REQUIRED_COLUMN_KEYS.every((k) => selectedKeySet.has(k))
                      : selectedCount === 0)
                  }
                  onClick={handleClearAll}
                  className="rounded px-2 py-0.5 font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-text-default active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  Clear all
                </button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleResetDefault}
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-text-default active:scale-95 disabled:opacity-40 cursor-pointer"
                  title="Reset to default 10 columns"
                >
                  <RotateCcw className="h-3 w-3" strokeWidth={2} />
                  Reset to default
                </button>
              </div>
            </div>

            {/* Always Include Required Fields Switch Card */}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-3.5 py-2.5 transition-colors">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="always-include-required-fields"
                  className="block font-segoe text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer select-none"
                >
                  Always include required fields
                </label>
                <p className="font-segoe text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                  Always include No., Organization Name, and URN in every export.
                </p>
              </div>
              <Switch
                id="always-include-required-fields"
                checked={alwaysIncludeRequired}
                onCheckedChange={handleToggleAlwaysIncludeRequired}
                disabled={isSubmitting}
                aria-label="Always include required fields"
              />
            </div>

            {/* 2x2 Column Groups Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {YORP_REGISTRY_COLUMN_GROUPS.map((group) => {
                const groupColumns = columnsByGroup.get(group.key) ?? [];
                const groupSelectedCount = groupColumns.filter((col) => selectedKeySet.has(col.key)).length;
                const isAllGroupSelected = groupColumns.length > 0 && groupSelectedCount === groupColumns.length;
                const isIndeterminate = groupSelectedCount > 0 && groupSelectedCount < groupColumns.length;

                return (
                  <div
                    key={group.key}
                    className="flex flex-col rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-2.5 space-y-1.5 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-1.5 px-1">
                      <span className="font-segoe text-[10.5px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {group.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <SectionSelectAllCheckbox
                          checked={isAllGroupSelected}
                          indeterminate={isIndeterminate}
                          disabled={isSubmitting}
                          onChange={() => handleToggleSection(group.key)}
                          groupLabel={group.label}
                        />
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="font-segoe text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          {groupSelectedCount}/{groupColumns.length}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-0.5 pt-0.5">
                      {groupColumns.map((col) => {
                        const isChecked = selectedKeySet.has(col.key);
                        const isRequiredField = YORP_REGISTRY_REQUIRED_COLUMN_KEYS.includes(col.key);
                        const isLockedRequired = alwaysIncludeRequired && isRequiredField;

                        return (
                          <label
                            key={col.key}
                            className={cn(
                              "flex items-center justify-between gap-2.5 rounded-md px-2 py-1.5 text-left transition-all duration-150 select-none active:scale-[0.99]",
                              isLockedRequired
                                ? "bg-admin-surface dark:bg-slate-800/90 shadow-2xs border border-sky-200/80 dark:border-sky-900/60 cursor-default"
                                : isChecked
                                ? "bg-admin-surface dark:bg-slate-800/90 shadow-2xs border border-slate-200/90 dark:border-slate-700/70 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600"
                                : "hover:bg-slate-200/50 dark:hover:bg-slate-800/40 border border-transparent cursor-pointer",
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isSubmitting || isLockedRequired}
                                onChange={() => !isLockedRequired && handleToggleColumn(col.key)}
                                className={cn(
                                  "h-4 w-4 shrink-0 rounded border-slate-300 dark:border-slate-600 text-public-bg-brand focus:ring-public-bg-brand accent-public-bg-brand",
                                  isLockedRequired ? "cursor-not-allowed opacity-90" : "cursor-pointer",
                                )}
                                aria-label={col.label}
                              />
                              <span className="font-segoe text-xs font-medium text-text-default truncate">
                                {col.label}
                              </span>
                            </div>
                            {isLockedRequired ? (
                              <span className="shrink-0 rounded bg-sky-100 dark:bg-sky-950/80 px-1.5 py-0.5 font-segoe text-[9.5px] font-semibold text-sky-800 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60">
                                Required
                              </span>
                            ) : col.isDefault ? (
                              <span className="shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-segoe text-[9.5px] font-medium text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                                Default
                              </span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Validation alert if 0 columns selected */}
            {selectedCount === 0 ? (
              <div className="rounded-md border border-amber-300/80 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-900/60 p-2 text-center font-segoe text-xs font-semibold text-amber-900 dark:text-amber-200">
                Select at least one column to generate an export.
              </div>
            ) : null}
          </div>

          {/* Export Format Selector */}
          <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
            <label className="font-segoe text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Export Format
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {(["pdf", "xlsx", "csv"] as ExportFormat[]).map((formatKey) => {
                const isSelected = selectedFormat === formatKey;
                const config = FORMAT_CONFIGS[formatKey];
                const Icon = config.icon;

                return (
                  <button
                    key={formatKey}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setSelectedFormat(formatKey)}
                    className={cn(
                      "group relative flex min-h-[48px] w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all duration-150 ease-out cursor-pointer active:scale-[0.98]",
                      isSelected
                        ? "border-public-bg-brand bg-sky-50/50 dark:bg-sky-950/30 ring-1 ring-public-bg-brand/40 shadow-2xs"
                        : "border-slate-200 dark:border-slate-800 bg-admin-surface hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-md transition-colors",
                        isSelected
                          ? "bg-public-bg-brand text-white shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700",
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-segoe text-xs font-semibold leading-tight text-text-default">
                        {config.title}
                      </p>
                      <p className="truncate font-segoe text-[10.5px] text-slate-500 dark:text-slate-400">
                        {config.description}
                      </p>
                    </div>
                    {isSelected ? (
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-public-bg-brand text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PDF Page Setup Options (Visible only when PDF format is active) */}
          {isPdf && (
            <div className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3 space-y-2.5 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-segoe text-[10.5px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  PDF Page Setup
                </span>
                <span className="font-segoe text-[11px] text-slate-400 dark:text-slate-500">
                  {selectedCount > 8 ? "Landscape recommended for multi-column layout" : "Layout options"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Paper Size Selector */}
                <div className="space-y-1.5">
                  <label htmlFor="pdf-paper-size" className="font-segoe text-xs font-medium text-slate-700 dark:text-slate-300">
                    Paper Size
                  </label>
                  <Select
                    value={paperSize}
                    onValueChange={(value) => setPaperSize(value as PdfPaperSize)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="pdf-paper-size"
                      className="h-9 w-full border-slate-300 dark:border-slate-700 bg-admin-surface text-xs font-normal text-slate-800 dark:text-slate-200 hover:border-slate-400 focus:ring-2 focus:ring-public-bg-brand rounded-md"
                    >
                      <SelectValue placeholder="Select paper size" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56 border-slate-300 dark:border-slate-700">
                      {PDF_PAPER_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option.id} value={option.id} className="text-xs cursor-pointer">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{option.label}</span>
                            <span className="text-[11px] text-slate-400">({option.dimensions})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Orientation Selector */}
                <div className="space-y-1.5">
                  <label className="font-segoe text-xs font-medium text-slate-700 dark:text-slate-300">
                    Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setOrientation("landscape")}
                      className={cn(
                        "flex h-9 w-full items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 font-segoe text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer",
                        orientation === "landscape"
                          ? "border-public-bg-brand bg-public-bg-brand text-white shadow-2xs"
                          : "border-slate-300 dark:border-slate-700 bg-admin-surface text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                      )}
                    >
                      <RectangleHorizontal className="h-3.5 w-3.5 shrink-0 text-current" strokeWidth={1.8} />
                      <span>Landscape</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setOrientation("portrait")}
                      className={cn(
                        "flex h-9 w-full items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 font-segoe text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer",
                        orientation === "portrait"
                          ? "border-public-bg-brand bg-public-bg-brand text-white shadow-2xs"
                          : "border-slate-300 dark:border-slate-700 bg-admin-surface text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                      )}
                    >
                      <RectangleVertical className="h-3.5 w-3.5 shrink-0 text-current" strokeWidth={1.8} />
                      <span>Portrait</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Sticky Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200/90 dark:border-slate-800 bg-admin-surface dark:bg-slate-900 shrink-0">
          <div className="font-segoe text-xs sm:text-[13px] text-slate-500 dark:text-slate-400">
            {typeof recordCount === "number" ? (
              <span>
                <strong className="text-text-default font-semibold">{recordCount}</strong>{" "}
                {recordCount === 1 ? "record" : "records"} matching active filters
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5">
            <DialogClose asChild>
              <button
                type="button"
                disabled={isSubmitting}
                className="h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-admin-surface px-4 py-2 font-segoe text-xs sm:text-sm font-semibold text-text-default shadow-2xs transition-all hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="button"
              disabled={isSubmitting || selectedCount === 0}
              onClick={() => void handleGenerate()}
              aria-busy={isSubmitting}
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-public-bg-brand px-5 py-2 font-segoe text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:bg-bg-brand-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span role="status" aria-live="polite">Generating {selectedFormat.toUpperCase()}…</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" strokeWidth={2} />
                  <span>Generate Export</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
